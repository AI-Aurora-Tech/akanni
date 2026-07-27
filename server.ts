import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const FOCUS_TOKEN = process.env.FOCUS_NFE_TOKEN?.trim();
  const FOCUS_ENV = (process.env.FOCUS_NFE_ENVIRONMENT || 'sandbox').trim();
  const BASE_URL = FOCUS_ENV === 'production' 
    ? 'https://api.focusnfe.com.br' 
    : 'https://homologacao.focusnfe.com.br';

  console.log(`[FocusNFe] Configured for ${FOCUS_ENV} environment.`);

  const getFocusAuth = () => ({
    username: FOCUS_TOKEN || "",
    password: ""
  });

  // Emissão de NF-e (Produto)
  app.post("/api/nfe/emit", async (req, res) => {
    try {
      if (!FOCUS_TOKEN || FOCUS_TOKEN === "") {
        return res.status(500).json({ error: "FocusNFe Token não configurado ou vazio no Secrets." });
      }

      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: "ID do pedido obrigatório" });

      // Buscar pedido
      const { data: order, error: orderErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (orderErr || !order) return res.status(404).json({ error: "Pedido não encontrado" });

      // Verificar idempotência
      const { data: existingNfe } = await supabase.from('notas_fiscais').select('*').eq('pedido_id', orderId).single();
      if (existingNfe && existingNfe.status !== 'erro') {
        return res.status(409).json({ error: "Nota fiscal já emitida ou em processamento para este pedido", nfe: existingNfe });
      }

      const ufDestino = order.customer_address?.match(/([A-Z]{2})$/)?.[1] || "SP";
      const isInterestadual = ufDestino !== "SP";
      
      const cfop = isInterestadual ? "6101" : "5101";
      const localDestino = isInterestadual ? "2" : "1";
      
      const items = Array.isArray(order.items) ? order.items : (JSON.parse(order.items || "[]"));
      
      // Limpar CNPJ/CPF do destinatário
      const cpfCnpjDest = order.customer_tax_id ? order.customer_tax_id.replace(/\D/g, "") : null;
      if (!cpfCnpjDest) {
        return res.status(400).json({ error: "CPF/CNPJ do destinatário é obrigatório na emissão de NF-e." });
      }
      const isCnpj = cpfCnpjDest.length > 11;

      // Tratar endereço
      const addrParts = (order.customer_address || "").split(",");
      const logradouro = addrParts[0]?.trim() || "Não informado";
      const numero = addrParts[1]?.split("-")[0]?.trim() || "SN";
      const cep = order.customer_address?.match(/\d{5}-?\d{3}/)?.[0].replace("-", "") || "00000000";

      const payload = {
        natureza_operacao: "Venda de producao do estabelecimento",
        data_emissao: new Date().toISOString(),
        tipo_documento: 1, // Saída
        finalidade_emissao: 1, // Normal
        local_destino: Number(localDestino),
        consumidor_final: 1, 
        presenca_comprador: 2, 
        
        cnpj_emitente: "60920351000142",
        nome_emitente: "FBF CONFECCAO LTDA",
        logradouro_emitente: "R Dr. Gabriel Costa",
        numero_emitente: "14",
        bairro_emitente: "Vila Nova das Belezas",
        municipio_emitente: "Sao Paulo",
        uf_emitente: "SP",
        cep_emitente: "05777040",
        inscricao_estadual_emitente: "154196980110",
        regime_tributario_emitente: 1, 

        nome_destinatario: order.customer_name,
        [isCnpj ? "cnpj_destinatario" : "cpf_destinatario"]: cpfCnpjDest,
        indicador_inscricao_estadual_destinatario: 9, 
        logradouro_destinatario: logradouro,
        numero_destinatario: numero,
        bairro_destinatario: "Não Informado", 
        municipio_destinatario: "São Paulo", 
        uf_destinatario: ufDestino,
        cep_destinatario: cep,
        telefone_destinatario: (order.customer_phone || order.customer_tax_id)?.replace(/\D/g, "").substring(0, 11) || "", // Basic fallback

        modalidade_frete: 0, 

        items: items.map((item: any, idx: number) => {
          const unitPrice = Number(item.unitPrice) || 85;
          const qty = Number(item.quantity) || 1;
          return {
            numero_item: idx + 1,
            codigo_produto: item.id || `PROD-${idx + 1}`,
            descricao: `Camiseta ${item.shirtType || 'Padrao'} - ${item.fabricType || 'M'} ${item.fabricColor || 'B'}`,
            codigo_ncm: "61091000",
            cfop: cfop,
            unidade_comercial: "UN",
            quantidade_comercial: qty,
            valor_unitario_comercial: unitPrice.toFixed(2),
            valor_bruto: (qty * unitPrice).toFixed(2),
            unidade_tributavel: "UN",
            quantidade_tributavel: qty,
            valor_unitario_tributavel: unitPrice.toFixed(2),
            origem_mercadoria: "0",
            csosn: "400",
            icms_situacao_tributaria: "400"
          };
        }),
        
        valor_frete: "0.00",
        valor_seguro: "0.00",
        valor_desconto: "0.00",
        valor_outras_despesas: "0.00"
      };

      const ref = existingNfe ? existingNfe.ref : `PED${orderId.replace(/-/g, "").substring(0, 20).toUpperCase()}`;

      // Persistir com status "processando" antes da chamada
      if (existingNfe) {
        await supabase.from('notas_fiscais').update({
          status: 'processando',
          mensagem_erro: null,
          payload_enviado: payload,
          tentativas: (existingNfe.tentativas || 0) + 1,
          updated_at: new Date().toISOString()
        }).eq('id', existingNfe.id);
      } else {
        await supabase.from('notas_fiscais').insert({
          pedido_id: orderId,
          ref: ref,
          status: 'processando',
          ambiente: FOCUS_ENV,
          payload_enviado: payload
        });
      }

      console.log(`[FocusNFe] Sending request to: ${BASE_URL}/v2/nfe?ref=${ref}`);
      
      try {
        const response = await axios.post(`${BASE_URL}/v2/nfe?ref=${ref}`, payload, {
          auth: getFocusAuth(),
          timeout: 30000 
        });

        console.log(`[FocusNFe] Success (${response.status})`);
        
        // Asynchronously update status if 201 Autorizada or 202 Processando
        res.status(202).json({ message: "Emissão em processamento", ref });
      } catch (focusError: any) {
        const errorData = focusError.response?.data || focusError.message;
        console.error("[FocusNFe] Error Detail:", JSON.stringify(errorData, null, 2));
        
        await supabase.from('notas_fiscais').update({
          status: 'erro',
          mensagem_erro: errorData.mensagem || JSON.stringify(errorData),
          updated_at: new Date().toISOString()
        }).eq('ref', ref);

        if (focusError.response?.status === 422) {
          return res.status(422).json({ 
            error: "Dados inválidos", 
            mensagem: errorData.mensagem || "Verifique os dados fiscais.",
            erros: errorData.erros 
          });
        }
        res.status(focusError.response?.status || 500).json({ error: "Erro FocusNFe", details: errorData });
      }

    } catch (error: any) {
      console.error("[FocusNFe] Internal Error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Consultar NFe
  app.get("/api/nfe/status/:ref", async (req, res) => {
    try {
      if (!FOCUS_TOKEN) throw new Error("Missing Token");
      
      const response = await axios.get(`${BASE_URL}/v2/nfe/${req.params.ref}?completa=1`, {
        auth: getFocusAuth()
      });
      res.json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      res.status(error.response?.status || 500).json({ error: errorData });
    }
  });

  // Webhook para FocusNFe (Atualiza DB e pronto)
  app.post("/api/nfe/webhook", async (req, res) => {
    const WEBHOOK_SECRET = process.env.FOCUS_NFE_WEBHOOK_SECRET;
    
    // Verificação simples de secret
    if (WEBHOOK_SECRET && req.query.secret !== WEBHOOK_SECRET) {
      console.warn("[FocusNFe] Webhook Unauthorized access attempt");
      return res.status(401).send("Unauthorized");
    }

    const payload = req.body;
    console.log("[FocusNFe] Webhook received:", payload.ref);
    
    // Responder 200 rápido para FocusNFe
    res.status(200).send("OK");
    
    // Processar assíncrono
    try {
      if (!payload.ref) return;
      const status = payload.status; // autorizado, processando_autorizacao, erro_autorizacao, cancelado
      const internalStatus = status === 'autorizado' ? 'autorizada' : (status === 'erro_autorizacao' ? 'erro' : status);
      
      const updateData: any = {
        status: internalStatus,
        updated_at: new Date().toISOString()
      };

      if (status === 'autorizado') {
        updateData.chave_acesso = payload.chave_nfe;
        updateData.numero = payload.numero;
        updateData.serie = payload.serie;
        updateData.url_xml = payload.caminho_xml_nota_fiscal;
        updateData.url_danfe = payload.caminho_danfe;
        updateData.protocolo = payload.protocolo_nfe;
      } else if (status === 'erro_autorizacao') {
        updateData.mensagem_erro = payload.mensagem_sefaz || payload.erros?.map((e: any) => e.mensagem).join(", ");
      }

      await supabase.from('notas_fiscais').update(updateData).eq('ref', payload.ref);
      
      // Se autorizada, atualiza tb o pedido principal para nfe_issued = true
      if (status === 'autorizado') {
        const { data: nfe } = await supabase.from('notas_fiscais').select('pedido_id').eq('ref', payload.ref).single();
        if (nfe && nfe.pedido_id) {
          await supabase.from('orders').update({ nfe_issued: true }).eq('id', nfe.pedido_id);
        }
      }
    } catch (err) {
      console.error("[FocusNFe] Erro no processamento do webhook:", err);
    }
  });

  // Polling Job (Rede de segurança se o webhook falhar)
  setInterval(async () => {
    try {
      if (!FOCUS_TOKEN) return;
      // Busca nfes presas como 'processando' há mais de 2 minutos
      const twoMinutesAgo = new Date(Date.now() - 2 * 60000).toISOString();
      const { data: presas } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('status', 'processando')
        .lte('updated_at', twoMinutesAgo);

      if (presas && presas.length > 0) {
        console.log(`[FocusNFe] Polling ${presas.length} notas presas...`);
        for (const nfe of presas) {
          try {
            const resp = await axios.get(`${BASE_URL}/v2/nfe/${nfe.ref}?completa=1`, { auth: getFocusAuth() });
            const p = resp.data;
            const status = p.status;
            const internalStatus = status === 'autorizado' ? 'autorizada' : (status === 'erro_autorizacao' ? 'erro' : status);
            
            const updateData: any = {
              status: internalStatus,
              updated_at: new Date().toISOString()
            };
            if (status === 'autorizado') {
              updateData.chave_acesso = p.chave_nfe;
              updateData.numero = p.numero;
              updateData.serie = p.serie;
              updateData.url_xml = BASE_URL + p.caminho_xml_nota_fiscal;
              updateData.url_danfe = BASE_URL + p.caminho_danfe;
            } else if (status === 'erro_autorizacao') {
              updateData.mensagem_erro = p.mensagem_sefaz;
            }

            await supabase.from('notas_fiscais').update(updateData).eq('ref', nfe.ref);
            if (status === 'autorizado' && nfe.pedido_id) {
              await supabase.from('orders').update({ nfe_issued: true }).eq('id', nfe.pedido_id);
            }
          } catch (err: any) {
            console.error(`[FocusNFe] Polling falhou para ${nfe.ref}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error("[FocusNFe] Erro no job de polling:", err);
    }
  }, 5 * 60000); // 5 min interval

  // 404 for API routes to prevent SPA fallback
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
