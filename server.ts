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
  const IS_PRODUCTION = FOCUS_ENV === 'production';
  const BASE_URL = IS_PRODUCTION
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  console.log(`[FocusNFe] Configured for ${FOCUS_ENV} environment (${BASE_URL}).`);
  if (!IS_PRODUCTION) {
    console.log("[FocusNFe] AMBIENTE DE HOMOLOGAÇÃO: as notas emitidas NÃO possuem validade fiscal.");
  }

  // Dados do emitente (empresa Akanni). Configuráveis por variáveis de ambiente,
  // com os valores atuais como padrão para não quebrar a configuração existente.
  const EMITENTE = {
    cnpj_emitente: (process.env.FOCUS_NFE_CNPJ_EMITENTE || "60920351000142").replace(/\D/g, ""),
    nome_emitente: process.env.FOCUS_NFE_NOME_EMITENTE || "FBF CONFECCAO LTDA",
    logradouro_emitente: process.env.FOCUS_NFE_LOGRADOURO_EMITENTE || "R Dr. Gabriel Costa",
    numero_emitente: process.env.FOCUS_NFE_NUMERO_EMITENTE || "14",
    bairro_emitente: process.env.FOCUS_NFE_BAIRRO_EMITENTE || "Vila Nova das Belezas",
    municipio_emitente: process.env.FOCUS_NFE_MUNICIPIO_EMITENTE || "Sao Paulo",
    uf_emitente: process.env.FOCUS_NFE_UF_EMITENTE || "SP",
    cep_emitente: (process.env.FOCUS_NFE_CEP_EMITENTE || "05777040").replace(/\D/g, ""),
    inscricao_estadual_emitente: process.env.FOCUS_NFE_IE_EMITENTE || "154196980110",
    regime_tributario_emitente: Number(process.env.FOCUS_NFE_REGIME_TRIBUTARIO || 1),
  };

  // Preço unitário de referência quando o item do pedido não possui valor definido.
  const DEFAULT_UNIT_PRICE = Number(process.env.FOCUS_NFE_PRECO_PADRAO || 85);

  const getFocusAuth = () => ({
    username: FOCUS_TOKEN || "",
    password: ""
  });

  // Consulta o status de uma NF-e na Focus e devolve o payload cru.
  const consultarNfe = async (ref: string) => {
    const resp = await axios.get(`${BASE_URL}/v2/nfe/${ref}?completa=1`, { auth: getFocusAuth() });
    return resp.data;
  };

  // Aplica na tabela local o retorno da Focus e sincroniza o pedido.
  const aplicarRetornoNfe = async (ref: string, pedidoId: string | null, p: any) => {
    const status = p.status;
    const internalStatus = status === 'autorizado'
      ? 'autorizada'
      : (status === 'erro_autorizacao' || status === 'denegado' ? 'erro' : status);

    const updateData: any = {
      status: internalStatus,
      updated_at: new Date().toISOString(),
    };

    if (status === 'autorizado') {
      updateData.chave_acesso = p.chave_nfe;
      updateData.numero = p.numero;
      updateData.serie = p.serie;
      updateData.protocolo = p.protocolo_nfe;
      updateData.url_xml = p.caminho_xml_nota_fiscal ? BASE_URL + p.caminho_xml_nota_fiscal : null;
      updateData.url_danfe = p.caminho_danfe ? BASE_URL + p.caminho_danfe : null;
      updateData.mensagem_erro = null;
    } else if (internalStatus === 'erro') {
      updateData.mensagem_erro = p.mensagem_sefaz
        || (Array.isArray(p.erros) ? p.erros.map((e: any) => e.mensagem).join("; ") : null)
        || "Erro na autorização junto à Sefaz.";
    }

    await supabase.from('notas_fiscais').update(updateData).eq('ref', ref);

    if (pedidoId) {
      await supabase.from('orders').update({ nfe_issued: status === 'autorizado' }).eq('id', pedidoId);
    }
    return { internalStatus, updateData };
  };

  // Emissão de NF-e (Produto)
  app.post("/api/nfe/emit", async (req, res) => {
    try {
      if (!FOCUS_TOKEN || FOCUS_TOKEN === "") {
        return res.status(500).json({ error: "Token do FocusNFe não configurado. Verifique a variável FOCUS_NFE_TOKEN." });
      }

      // itemPrices: preços unitários confirmados na tela de conferência (opcional).
      const { orderId, itemPrices } = req.body;
      if (!orderId) return res.status(400).json({ error: "ID do pedido obrigatório" });

      // Buscar pedido
      const { data: order, error: orderErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (orderErr || !order) return res.status(404).json({ error: "Pedido não encontrado" });

      // Idempotência: bloqueia se já existe nota viva (processando/autorizada).
      // Notas com erro ou canceladas são descartadas para permitir nova emissão limpa.
      const { data: existingNfe } = await supabase.from('notas_fiscais').select('*').eq('pedido_id', orderId).maybeSingle();
      if (existingNfe && (existingNfe.status === 'processando' || existingNfe.status === 'autorizada')) {
        return res.status(409).json({
          error: "Já existe uma nota fiscal ativa ou em processamento para este pedido.",
          nfe: existingNfe,
        });
      }
      if (existingNfe) {
        // erro / cancelado: remove para reemitir do zero com nova referência.
        await supabase.from('notas_fiscais').delete().eq('id', existingNfe.id);
      }

      const ufDestino = (order.customer_address?.match(/([A-Z]{2})(?:\s*-\s*CEP.*)?$/)?.[1] || "SP").toUpperCase();
      const isInterestadual = ufDestino !== EMITENTE.uf_emitente;

      const cfop = isInterestadual ? "6101" : "5101";
      const localDestino = isInterestadual ? 2 : 1;

      const items = Array.isArray(order.items) ? order.items : (JSON.parse(order.items || "[]"));
      if (!items.length) {
        return res.status(400).json({ error: "O pedido não possui itens para emissão." });
      }

      // Limpar CNPJ/CPF do destinatário
      const cpfCnpjDest = order.customer_tax_id ? order.customer_tax_id.replace(/\D/g, "") : null;
      if (!cpfCnpjDest) {
        return res.status(400).json({ error: "CPF/CNPJ do destinatário é obrigatório para emitir a NF-e. Edite o pedido e informe o documento do cliente." });
      }
      const isCnpj = cpfCnpjDest.length > 11;

      // Tratar endereço
      const addrParts = (order.customer_address || "").split(",");
      const logradouro = addrParts[0]?.trim() || "Não informado";
      const numero = addrParts[1]?.split("-")[0]?.trim() || "SN";
      const cep = (order.customer_address?.match(/\d{5}-?\d{3}/)?.[0] || "00000000").replace("-", "");

      const precoDe = (item: any, idx: number) => {
        const override = Array.isArray(itemPrices) ? Number(itemPrices[idx]) : NaN;
        if (!Number.isNaN(override) && override > 0) return override;
        const stored = Number(item.unitPrice);
        if (!Number.isNaN(stored) && stored > 0) return stored;
        return DEFAULT_UNIT_PRICE;
      };

      const nfeItems = items.map((item: any, idx: number) => {
        const unitPrice = precoDe(item, idx);
        const qty = Number(item.quantity) || 1;
        const descricaoBase = `Camisa ${item.shirtType || 'Padrao'}`;
        const detalhes = [item.fabricType, item.color || item.fabricColor].filter(Boolean).join(' ');
        return {
          numero_item: idx + 1,
          codigo_produto: item.templateId || item.id || `PROD-${idx + 1}`,
          descricao: (detalhes ? `${descricaoBase} - ${detalhes}` : descricaoBase).substring(0, 120),
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
      });

      const payload = {
        natureza_operacao: "Venda de producao do estabelecimento",
        data_emissao: new Date().toISOString(),
        tipo_documento: 1, // Saída
        finalidade_emissao: 1, // Normal
        local_destino: localDestino,
        consumidor_final: 1,
        presenca_comprador: 2,

        ...EMITENTE,

        nome_destinatario: order.customer_name,
        [isCnpj ? "cnpj_destinatario" : "cpf_destinatario"]: cpfCnpjDest,
        indicador_inscricao_estadual_destinatario: 9,
        logradouro_destinatario: logradouro,
        numero_destinatario: numero,
        bairro_destinatario: "Não Informado",
        municipio_destinatario: EMITENTE.municipio_emitente,
        uf_destinatario: ufDestino,
        cep_destinatario: cep,
        telefone_destinatario: (order.customer_phone || "").replace(/\D/g, "").substring(0, 11) || undefined,
        email_destinatario: order.customer_email || undefined,

        modalidade_frete: 9, // Sem frete

        items: nfeItems,

        valor_frete: "0.00",
        valor_seguro: "0.00",
        valor_desconto: "0.00",
        valor_outras_despesas: "0.00"
      };

      // Referência única por tentativa de emissão (a Focus não permite reusar ref).
      const shortId = orderId.replace(/-/g, "").substring(0, 12).toUpperCase();
      const ref = `PED${shortId}${Date.now().toString(36).toUpperCase()}`;

      await supabase.from('notas_fiscais').insert({
        pedido_id: orderId,
        ref: ref,
        status: 'processando',
        ambiente: FOCUS_ENV,
        payload_enviado: payload,
        tentativas: 1,
      });

      console.log(`[FocusNFe] Enviando emissão: ${BASE_URL}/v2/nfe?ref=${ref} (ambiente: ${FOCUS_ENV})`);

      try {
        await axios.post(`${BASE_URL}/v2/nfe?ref=${ref}`, payload, {
          auth: getFocusAuth(),
          timeout: 30000
        });
      } catch (focusError: any) {
        const errorData = focusError.response?.data || { mensagem: focusError.message };
        console.error("[FocusNFe] Erro na emissão:", JSON.stringify(errorData, null, 2));

        const mensagem = errorData.mensagem
          || (Array.isArray(errorData.erros) ? errorData.erros.map((e: any) => e.mensagem).join("; ") : null)
          || "Erro ao comunicar com o FocusNFe.";

        await supabase.from('notas_fiscais').update({
          status: 'erro',
          mensagem_erro: mensagem,
          updated_at: new Date().toISOString()
        }).eq('ref', ref);

        return res.status(422).json({
          status: 'erro',
          error: "Não foi possível emitir a nota fiscal.",
          mensagem,
          erros: errorData.erros,
          ref,
        });
      }

      // Emissão aceita — a Focus processa de forma assíncrona.
      // Fazemos um polling curto para devolver o resultado final (autorizada/erro)
      // já na resposta, permitindo feedback imediato ao usuário.
      let finalStatus = 'processando';
      let mensagemErro: string | null = null;
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          const p = await consultarNfe(ref);
          if (p.status && p.status !== 'processando_autorizacao') {
            const { internalStatus, updateData } = await aplicarRetornoNfe(ref, orderId, p);
            finalStatus = internalStatus;
            mensagemErro = updateData.mensagem_erro || null;
            break;
          }
        } catch (pollErr: any) {
          console.warn(`[FocusNFe] Polling tentativa ${i + 1} falhou:`, pollErr.message);
        }
      }

      if (finalStatus === 'autorizada') {
        const { data: nf } = await supabase.from('notas_fiscais').select('*').eq('ref', ref).single();
        return res.status(200).json({ status: 'autorizada', ref, nfe: nf });
      }
      if (finalStatus === 'erro') {
        return res.status(422).json({ status: 'erro', ref, mensagem: mensagemErro || "Erro na autorização da nota fiscal." });
      }
      // Ainda processando: webhook / job de polling concluirão em segundo plano.
      return res.status(202).json({ status: 'processando', ref, message: "Emissão em processamento na Sefaz." });

    } catch (error: any) {
      console.error("[FocusNFe] Erro interno na emissão:", error);
      res.status(500).json({ error: "Erro interno do servidor ao emitir a nota fiscal." });
    }
  });

  // Cancelamento de NF-e
  app.post("/api/nfe/cancel", async (req, res) => {
    try {
      if (!FOCUS_TOKEN || FOCUS_TOKEN === "") {
        return res.status(500).json({ error: "Token do FocusNFe não configurado." });
      }

      const { orderId, justificativa } = req.body;
      if (!orderId) return res.status(400).json({ error: "ID do pedido obrigatório" });

      const { data: nfe } = await supabase.from('notas_fiscais').select('*').eq('pedido_id', orderId).maybeSingle();
      if (!nfe) return res.status(404).json({ error: "Nenhuma nota fiscal encontrada para este pedido." });
      if (nfe.status !== 'autorizada') {
        return res.status(400).json({ error: "Só é possível cancelar notas fiscais autorizadas." });
      }

      const motivo = (justificativa && String(justificativa).trim().length >= 15)
        ? String(justificativa).trim()
        : "Cancelamento solicitado pelo emitente - dados do pedido incorretos.";

      try {
        await axios.delete(`${BASE_URL}/v2/nfe/${nfe.ref}`, {
          auth: getFocusAuth(),
          data: { justificativa: motivo },
          timeout: 30000,
        });
      } catch (focusError: any) {
        const errorData = focusError.response?.data || { mensagem: focusError.message };
        const mensagem = errorData.mensagem
          || (Array.isArray(errorData.erros) ? errorData.erros.map((e: any) => e.mensagem).join("; ") : null)
          || "Erro ao cancelar a nota fiscal no FocusNFe.";
        console.error("[FocusNFe] Erro no cancelamento:", JSON.stringify(errorData, null, 2));
        return res.status(422).json({ error: "Não foi possível cancelar a nota fiscal.", mensagem });
      }

      // Cancelada com sucesso: remove a nota e libera o pedido para nova emissão.
      await supabase.from('notas_fiscais').delete().eq('id', nfe.id);
      await supabase.from('orders').update({ nfe_issued: false }).eq('id', orderId);

      return res.status(200).json({ status: 'cancelado', message: "Nota fiscal cancelada com sucesso." });
    } catch (error: any) {
      console.error("[FocusNFe] Erro interno no cancelamento:", error);
      res.status(500).json({ error: "Erro interno do servidor ao cancelar a nota fiscal." });
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
      const { data: nfe } = await supabase.from('notas_fiscais').select('pedido_id').eq('ref', payload.ref).maybeSingle();
      await aplicarRetornoNfe(payload.ref, nfe?.pedido_id || null, payload);
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
            const p = await consultarNfe(nfe.ref);
            if (p.status && p.status !== 'processando_autorizacao') {
              await aplicarRetornoNfe(nfe.ref, nfe.pedido_id, p);
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
