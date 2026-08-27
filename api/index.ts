import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// Inicialização PREGUIÇOSA do Supabase: criar o cliente no topo do módulo com
// URL/KEY vazios lança erro e derruba a função serverless inteira
// (FUNCTION_INVOCATION_FAILED) antes de qualquer rota rodar. Fazendo lazy, um
// erro de configuração vira uma resposta JSON legível em vez de um crash.
let _supabase: any = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase não configurado no servidor. Defina VITE_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) nas variáveis de ambiente da Vercel.");
  }
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return _supabase;
}

const FOCUS_TOKEN = process.env.FOCUS_NFE_TOKEN?.trim();
const FOCUS_ENV = (process.env.FOCUS_NFE_ENVIRONMENT || 'sandbox').trim();
const IS_PRODUCTION = FOCUS_ENV === 'production';
const BASE_URL = IS_PRODUCTION
  ? 'https://api.focusnfe.com.br'
  : 'https://homologacao.focusnfe.com.br';

// Texto obrigatório no nome do destinatário em ambiente de HOMOLOGAÇÃO (regra da Sefaz).
const HOMOLOG_DEST_NAME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

// Preço unitário de referência quando o item do pedido não tem valor definido.
const DEFAULT_UNIT_PRICE = Number(process.env.FOCUS_NFE_PRECO_PADRAO || 85);

// Dados do emitente: SÓ enviados se explicitamente configurados por variável de
// ambiente. Se nada for configurado, o FocusNFe usa a empresa vinculada ao TOKEN
// (a empresa Akanni que você cadastrou), evitando divergência de CNPJ.
function buildEmitente(): Record<string, any> {
  const raw: Record<string, any> = {
    cnpj_emitente: process.env.FOCUS_NFE_CNPJ_EMITENTE?.replace(/\D/g, ""),
    nome_emitente: process.env.FOCUS_NFE_NOME_EMITENTE,
    logradouro_emitente: process.env.FOCUS_NFE_LOGRADOURO_EMITENTE,
    numero_emitente: process.env.FOCUS_NFE_NUMERO_EMITENTE,
    bairro_emitente: process.env.FOCUS_NFE_BAIRRO_EMITENTE,
    municipio_emitente: process.env.FOCUS_NFE_MUNICIPIO_EMITENTE,
    uf_emitente: process.env.FOCUS_NFE_UF_EMITENTE,
    cep_emitente: process.env.FOCUS_NFE_CEP_EMITENTE?.replace(/\D/g, ""),
    inscricao_estadual_emitente: process.env.FOCUS_NFE_IE_EMITENTE,
    regime_tributario_emitente: process.env.FOCUS_NFE_REGIME_TRIBUTARIO
      ? Number(process.env.FOCUS_NFE_REGIME_TRIBUTARIO)
      : undefined,
  };
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ''));
}
const EMITENTE = buildEmitente();
const UF_EMITENTE = (EMITENTE.uf_emitente as string) || process.env.FOCUS_NFE_UF_EMITENTE || "SP";
const MUNICIPIO_EMITENTE = (EMITENTE.municipio_emitente as string) || "Sao Paulo";

const getFocusAuth = () => ({ username: FOCUS_TOKEN || "", password: "" });

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

  await getSupabase().from('notas_fiscais').update(updateData).eq('ref', ref);

  if (pedidoId) {
    await getSupabase().from('orders').update({ nfe_issued: status === 'autorizado' }).eq('id', pedidoId);
  }
  return { internalStatus, updateData };
};

// Extrai a mensagem de erro mais legível possível de um erro do axios/FocusNFe.
const extrairMensagemFocus = (err: any): { mensagem: string; status?: number; erros?: any } => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (data) {
    const mensagem = data.mensagem
      || (Array.isArray(data.erros) ? data.erros.map((e: any) => e.mensagem || JSON.stringify(e)).join("; ") : null)
      || (typeof data === 'string' ? data : JSON.stringify(data));
    return { mensagem, status, erros: data.erros };
  }
  return { mensagem: err?.message || "Erro ao comunicar com o FocusNFe.", status };
};

// Job de segurança: reconsulta notas presas em "processando".
export async function runPollingOnce() {
  try {
    if (!FOCUS_TOKEN) return;
    const twoMinutesAgo = new Date(Date.now() - 2 * 60000).toISOString();
    const { data: presas } = await getSupabase()
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
}

// Cria e retorna o app Express com todas as rotas /api (sem listen, sem Vite).
// Usado tanto pelo servidor local (server.ts) quanto pela função serverless (api/index.ts).
export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  console.log(`[FocusNFe] API pronta para ambiente ${FOCUS_ENV} (${BASE_URL}).`);
  if (!IS_PRODUCTION) {
    console.log("[FocusNFe] HOMOLOGAÇÃO: notas de teste NÃO têm validade fiscal.");
  }

  // Diagnóstico: mostra quais variáveis de ambiente a função enxerga em runtime
  // (sem expor valores). Útil para depurar deploy na Vercel.
  app.get("/api/nfe/health", (_req, res) => {
    res.json({
      ok: true,
      ambiente: FOCUS_ENV,
      focus_token_configurado: !!FOCUS_TOKEN,
      supabase_url_configurada: !!SUPABASE_URL,
      supabase_key_configurada: !!SUPABASE_KEY,
      emitente_via_env: Object.keys(EMITENTE).length > 0,
    });
  });

  // Emissão de NF-e (Produto)
  app.post("/api/nfe/emit", async (req, res) => {
    try {
      if (!FOCUS_TOKEN) {
        return res.status(500).json({ status: 'erro', mensagem: "Token do FocusNFe não configurado no servidor (variável FOCUS_NFE_TOKEN)." });
      }

      const { orderId, itemPrices } = req.body;
      if (!orderId) return res.status(400).json({ status: 'erro', mensagem: "ID do pedido obrigatório." });

      const { data: order, error: orderErr } = await getSupabase().from('orders').select('*').eq('id', orderId).single();
      if (orderErr || !order) return res.status(404).json({ status: 'erro', mensagem: "Pedido não encontrado." });

      // Idempotência: bloqueia se já existe nota viva (processando/autorizada).
      const { data: existingNfe } = await getSupabase().from('notas_fiscais').select('*').eq('pedido_id', orderId).maybeSingle();
      if (existingNfe && (existingNfe.status === 'processando' || existingNfe.status === 'autorizada')) {
        return res.status(409).json({ status: existingNfe.status, mensagem: "Já existe uma nota fiscal ativa ou em processamento para este pedido.", nfe: existingNfe });
      }
      if (existingNfe) {
        await getSupabase().from('notas_fiscais').delete().eq('id', existingNfe.id);
      }

      const ufDestino = (order.customer_address?.match(/([A-Z]{2})(?:\s*-\s*CEP.*)?$/)?.[1] || UF_EMITENTE).toUpperCase();
      const isInterestadual = ufDestino !== UF_EMITENTE.toUpperCase();
      const cfop = isInterestadual ? "6101" : "5101";
      const localDestino = isInterestadual ? 2 : 1;

      const items = Array.isArray(order.items) ? order.items : (JSON.parse(order.items || "[]"));
      if (!items.length) {
        return res.status(400).json({ status: 'erro', mensagem: "O pedido não possui itens para emissão." });
      }

      const cpfCnpjDest = order.customer_tax_id ? order.customer_tax_id.replace(/\D/g, "") : null;
      if (!cpfCnpjDest) {
        return res.status(400).json({ status: 'erro', mensagem: "CPF/CNPJ do destinatário é obrigatório. Edite o pedido e informe o documento do cliente." });
      }
      const isCnpj = cpfCnpjDest.length > 11;

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
          // ICMS do item. Empresa é Simples Nacional (usa CSOSN "400").
          // O FocusNFe gera o grupo <imposto>/<ICMS> a partir de
          // icms_situacao_tributaria (que aqui carrega o CSOSN); sem ele, o
          // grupo <imposto> não é gerado e a Sefaz recusa por XML inválido.
          // icms_origem preenche a origem da mercadoria (0 = Nacional).
          icms_origem: "0",
          icms_situacao_tributaria: "400",
          icms_csosn: "400",
          // PIS/COFINS obrigatórios no XML. Para Simples Nacional sem tributação
          // separada, usa-se CST "99" (outras operações) com base/alíquota/valor
          // zerados (o recolhimento ocorre no DAS).
          pis_situacao_tributaria: "99",
          pis_base_calculo: "0.00",
          pis_aliquota_porcentual: "0.00",
          pis_valor: "0.00",
          cofins_situacao_tributaria: "99",
          cofins_base_calculo: "0.00",
          cofins_aliquota_porcentual: "0.00",
          cofins_valor: "0.00"
        };
      });

      // Em homologação, a Sefaz exige o nome fixo no destinatário.
      const nomeDestinatario = IS_PRODUCTION ? order.customer_name : HOMOLOG_DEST_NAME;

      const payload: Record<string, any> = {
        natureza_operacao: "Venda de producao do estabelecimento",
        data_emissao: new Date().toISOString(),
        tipo_documento: 1,
        finalidade_emissao: 1,
        local_destino: localDestino,
        consumidor_final: 1,
        presenca_comprador: 2,

        ...EMITENTE, // vazio por padrão -> FocusNFe usa a empresa do token

        nome_destinatario: nomeDestinatario,
        [isCnpj ? "cnpj_destinatario" : "cpf_destinatario"]: cpfCnpjDest,
        indicador_inscricao_estadual_destinatario: 9,
        logradouro_destinatario: logradouro,
        numero_destinatario: numero,
        bairro_destinatario: "Não Informado",
        municipio_destinatario: MUNICIPIO_EMITENTE,
        uf_destinatario: ufDestino,
        cep_destinatario: cep,
        telefone_destinatario: (order.customer_phone || "").replace(/\D/g, "").substring(0, 11) || undefined,
        email_destinatario: order.customer_email || undefined,

        modalidade_frete: 9,
        items: nfeItems,

        valor_frete: "0.00",
        valor_seguro: "0.00",
        valor_desconto: "0.00",
        valor_outras_despesas: "0.00"
      };

      const shortId = orderId.replace(/-/g, "").substring(0, 12).toUpperCase();
      const ref = `PED${shortId}${Date.now().toString(36).toUpperCase()}`;

      await getSupabase().from('notas_fiscais').insert({
        pedido_id: orderId,
        ref: ref,
        status: 'processando',
        ambiente: FOCUS_ENV,
        payload_enviado: payload,
        tentativas: 1,
      });

      console.log(`[FocusNFe] Emitindo ref=${ref} (ambiente: ${FOCUS_ENV})`);

      try {
        await axios.post(`${BASE_URL}/v2/nfe?ref=${ref}`, payload, { auth: getFocusAuth(), timeout: 30000 });
      } catch (focusError: any) {
        const { mensagem, status, erros } = extrairMensagemFocus(focusError);
        console.error(`[FocusNFe] Erro na emissão (HTTP ${status}):`, JSON.stringify(focusError.response?.data || mensagem, null, 2));

        await getSupabase().from('notas_fiscais').update({ status: 'erro', mensagem_erro: mensagem, updated_at: new Date().toISOString() }).eq('ref', ref);
        return res.status(422).json({ status: 'erro', mensagem, erros, ref });
      }

      // Emissão aceita — polling curto (compatível com timeout de serverless).
      let finalStatus = 'processando';
      let mensagemErro: string | null = null;
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 2000));
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
        const { data: nf } = await getSupabase().from('notas_fiscais').select('*').eq('ref', ref).single();
        return res.status(200).json({ status: 'autorizada', ref, nfe: nf });
      }
      if (finalStatus === 'erro') {
        return res.status(422).json({ status: 'erro', ref, mensagem: mensagemErro || "Erro na autorização da nota fiscal." });
      }
      return res.status(202).json({ status: 'processando', ref, mensagem: "Emissão enviada; aguardando autorização da Sefaz." });

    } catch (error: any) {
      console.error("[FocusNFe] Erro interno na emissão:", error);
      res.status(500).json({ status: 'erro', mensagem: error?.message || "Erro interno do servidor ao emitir a nota fiscal." });
    }
  });

  // Cancelamento de NF-e
  app.post("/api/nfe/cancel", async (req, res) => {
    try {
      if (!FOCUS_TOKEN) return res.status(500).json({ mensagem: "Token do FocusNFe não configurado." });

      const { orderId, justificativa } = req.body;
      if (!orderId) return res.status(400).json({ mensagem: "ID do pedido obrigatório." });

      const { data: nfe } = await getSupabase().from('notas_fiscais').select('*').eq('pedido_id', orderId).maybeSingle();
      if (!nfe) return res.status(404).json({ mensagem: "Nenhuma nota fiscal encontrada para este pedido." });
      if (nfe.status !== 'autorizada') {
        return res.status(400).json({ mensagem: "Só é possível cancelar notas fiscais autorizadas." });
      }

      const motivo = (justificativa && String(justificativa).trim().length >= 15)
        ? String(justificativa).trim()
        : "Cancelamento solicitado pelo emitente - dados do pedido incorretos.";

      try {
        await axios.delete(`${BASE_URL}/v2/nfe/${nfe.ref}`, { auth: getFocusAuth(), data: { justificativa: motivo }, timeout: 30000 });
      } catch (focusError: any) {
        const { mensagem } = extrairMensagemFocus(focusError);
        console.error("[FocusNFe] Erro no cancelamento:", mensagem);
        return res.status(422).json({ mensagem });
      }

      await getSupabase().from('notas_fiscais').delete().eq('id', nfe.id);
      await getSupabase().from('orders').update({ nfe_issued: false }).eq('id', orderId);
      return res.status(200).json({ status: 'cancelado', mensagem: "Nota fiscal cancelada com sucesso." });
    } catch (error: any) {
      console.error("[FocusNFe] Erro interno no cancelamento:", error);
      res.status(500).json({ mensagem: error?.message || "Erro interno do servidor ao cancelar a nota fiscal." });
    }
  });

  // Consultar/sincronizar status de uma NF-e (usado no polling do frontend)
  app.get("/api/nfe/status/:ref", async (req, res) => {
    try {
      if (!FOCUS_TOKEN) return res.status(500).json({ status: 'erro', mensagem: "Token não configurado." });
      const ref = req.params.ref;
      const p = await consultarNfe(ref);

      let internalStatus = 'processando';
      let mensagem: string | null = null;
      if (p.status && p.status !== 'processando_autorizacao') {
        const { data: nfe } = await getSupabase().from('notas_fiscais').select('pedido_id').eq('ref', ref).maybeSingle();
        const r = await aplicarRetornoNfe(ref, nfe?.pedido_id || null, p);
        internalStatus = r.internalStatus;
        mensagem = r.updateData.mensagem_erro || null;
      }
      const { data: nota } = await getSupabase().from('notas_fiscais').select('*').eq('ref', ref).maybeSingle();
      res.json({ status: internalStatus, mensagem, nfe: nota, focus_status: p.status });
    } catch (error: any) {
      const { mensagem, status } = extrairMensagemFocus(error);
      res.status(status || 500).json({ status: 'erro', mensagem });
    }
  });

  // Webhook para FocusNFe
  app.post("/api/nfe/webhook", async (req, res) => {
    const WEBHOOK_SECRET = process.env.FOCUS_NFE_WEBHOOK_SECRET;
    if (WEBHOOK_SECRET && req.query.secret !== WEBHOOK_SECRET) {
      console.warn("[FocusNFe] Webhook não autorizado.");
      return res.status(401).send("Unauthorized");
    }
    const payload = req.body;
    console.log("[FocusNFe] Webhook recebido:", payload.ref);
    res.status(200).send("OK");
    try {
      if (!payload.ref) return;
      const { data: nfe } = await getSupabase().from('notas_fiscais').select('pedido_id').eq('ref', payload.ref).maybeSingle();
      await aplicarRetornoNfe(payload.ref, nfe?.pedido_id || null, payload);
    } catch (err) {
      console.error("[FocusNFe] Erro no processamento do webhook:", err);
    }
  });

  // 404 para rotas de API (evita cair no fallback da SPA)
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ mensagem: "Endpoint não encontrado." });
  });

  return app;
}

// ===== Handler serverless da Vercel =====
// Este arquivo é AUTOSSUFICIENTE (não importa arquivos relativos), evitando o
// ERR_MODULE_NOT_FOUND que ocorria ao importar "../apiApp" na Vercel.
let _app: any = null;
function getApp() { if (!_app) _app = createApiApp(); return _app; }

export default function handler(req: any, res: any) {
  try {
    if (req.url && !req.url.startsWith("/api")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
    return getApp()(req, res);
  } catch (err: any) {
    console.error("[api] Erro não tratado na função serverless:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ status: "erro", mensagem: err?.message || "Erro interno na função serverless." }));
    }
  }
}
