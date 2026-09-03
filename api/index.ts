import express from "express";
import axios from "axios";
import crypto from "crypto";
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

// ===== Webhooks de SAÍDA (nosso sistema -> sistema externo) =====
// Configure WEBHOOK_URL (destino) e, opcionalmente, WEBHOOK_OUTBOUND_SECRET
// (assina o corpo com HMAC-SHA256 no header X-Akanni-Signature).
const WEBHOOK_URL = process.env.WEBHOOK_URL?.trim();
const WEBHOOK_SECRET_OUT = (process.env.WEBHOOK_OUTBOUND_SECRET || process.env.WEBHOOK_SECRET || '').trim();

// Chave de API para a integração de ENTRADA (parceiros -> nosso sistema),
// usada por sistemas externos (ex.: Data Crazy) para criar pedidos/clientes.
const INTEGRATION_API_KEY = (process.env.INTEGRATION_API_KEY || '').trim();

// Envia um evento para o WEBHOOK_URL. No-op se não configurado. Não lança:
// captura o próprio erro para nunca quebrar o fluxo principal.
async function dispararWebhook(evento: string, dados: any) {
  if (!WEBHOOK_URL) return;
  try {
    const corpo = JSON.stringify({ evento, dados, enviado_em: new Date().toISOString() });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Akanni-Event': evento,
    };
    if (WEBHOOK_SECRET_OUT) {
      const assinatura = crypto.createHmac('sha256', WEBHOOK_SECRET_OUT).update(corpo).digest('hex');
      headers['X-Akanni-Signature'] = `sha256=${assinatura}`;
    }
    await axios.post(WEBHOOK_URL, corpo, { headers, timeout: 5000 });
    console.log(`[Webhook] Enviado: ${evento}`);
  } catch (err: any) {
    console.warn(`[Webhook] Falha ao enviar "${evento}":`, err?.message);
  }
}

// Rótulos legíveis (para o CRM/automação montar mensagens diretamente).
const LABEL_PEDIDO: Record<string, string> = {
  pending: 'Pendente', cutting: 'Corte', sewing: 'Costura', finishing: 'Acabamento', delivered: 'Despachado',
};
const LABEL_NFE: Record<string, string> = {
  processando: 'Processando', autorizada: 'Nota emitida', erro: 'Falha na emissão', cancelado: 'Nota cancelada',
};

// Telefone só com dígitos e no formato E.164 do Brasil (55 + DDD + número).
const telefoneE164 = (tel?: string | null) => {
  const d = (tel || '').replace(/\D/g, '');
  if (!d) return null;
  return d.startsWith('55') ? d : `55${d}`;
};

// Monta os dados do cliente a partir de um pedido (para o CRM agir: WhatsApp, etc.).
const clientePayload = (order: any) => ({
  nome: order?.customer_name || null,
  telefone: order?.customer_phone || null,
  telefone_e164: telefoneE164(order?.customer_phone),
  email: order?.customer_email || null,
  documento: order?.customer_tax_id || null,
});

// Valor total do pedido (soma de quantidade x preço unitário dos itens).
const valorTotalPedido = (order: any) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const total = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || DEFAULT_UNIT_PRICE), 0);
  return Number(total.toFixed(2));
};

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

  // Status anterior (para só disparar o webhook quando realmente mudar).
  const { data: anterior } = await getSupabase().from('notas_fiscais').select('status').eq('ref', ref).maybeSingle();

  await getSupabase().from('notas_fiscais').update(updateData).eq('ref', ref);

  if (pedidoId) {
    await getSupabase().from('orders').update({ nfe_issued: status === 'autorizado' }).eq('id', pedidoId);
  }

  if (anterior?.status !== internalStatus) {
    const { data: pedido } = pedidoId
      ? await getSupabase().from('orders').select('*').eq('id', pedidoId).maybeSingle()
      : { data: null };
    await dispararWebhook('nfe.status_alterado', {
      pedido_id: pedidoId,
      ref,
      status: internalStatus,
      status_label: LABEL_NFE[internalStatus] || internalStatus,
      numero: updateData.numero || null,
      serie: updateData.serie || null,
      chave_acesso: updateData.chave_acesso || null,
      url_danfe: updateData.url_danfe || null,
      url_xml: updateData.url_xml || null,
      mensagem_erro: updateData.mensagem_erro || null,
      cliente: pedido ? clientePayload(pedido) : null,
      valor_total: pedido ? valorTotalPedido(pedido) : null,
    });
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
      webhook_saida_configurado: !!WEBHOOK_URL,
      integracao_entrada_configurada: !!INTEGRATION_API_KEY,
    });
  });

  // ===== Integração de ENTRADA (parceiro -> nosso sistema) =====
  // Valida a chave de API enviada no header X-API-Key.
  const validarApiKey = (req: any, res: any): boolean => {
    if (!INTEGRATION_API_KEY) {
      res.status(500).json({ ok: false, erro: "Integração não configurada no servidor (defina INTEGRATION_API_KEY)." });
      return false;
    }
    const enviado = (req.header('X-API-Key') || req.header('x-api-key') || '').trim();
    if (enviado !== INTEGRATION_API_KEY) {
      res.status(401).json({ ok: false, erro: "X-API-Key inválida ou ausente." });
      return false;
    }
    return true;
  };

  // Teste de conectividade/autenticação para o parceiro.
  app.get("/api/integracao/ping", (req, res) => {
    if (!validarApiKey(req, res)) return;
    res.json({ ok: true, mensagem: "Autenticado com sucesso.", ambiente: FOCUS_ENV });
  });

  // Recebe um pedido + dados do cliente e cria no sistema (cliente + pedido).
  app.post("/api/integracao/pedidos", async (req, res) => {
    if (!validarApiKey(req, res)) return;
    try {
      const { referencia_externa, cliente, itens, data_entrega, observacoes, status } = req.body || {};

      if (!cliente || !cliente.nome || !String(cliente.nome).trim()) {
        return res.status(400).json({ ok: false, erro: "cliente.nome é obrigatório." });
      }
      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ ok: false, erro: "itens deve ser uma lista com ao menos 1 item." });
      }

      const validos = ['pending', 'cutting', 'sewing', 'finishing', 'delivered'];
      const statusPedido = validos.includes(status) ? status : 'pending';

      // Idempotência: se a referência externa já existe, devolve o pedido existente.
      if (referencia_externa) {
        const { data: existente } = await getSupabase().from('orders').select('id, status').eq('external_ref', String(referencia_externa)).maybeSingle();
        if (existente) {
          return res.status(200).json({ ok: true, duplicado: true, pedido_id: existente.id, status: existente.status, mensagem: "Pedido já existente para esta referência externa." });
        }
      }

      const end = cliente.endereco || {};
      const enderecoStr = end.logradouro
        ? `${end.logradouro}, ${end.numero || 'SN'}${end.complemento ? ', ' + end.complemento : ''}, ${end.bairro || ''}, ${end.cidade || ''}/${end.uf || ''} - CEP: ${end.cep || ''}`
        : '';
      const documento = cliente.documento ? String(cliente.documento).trim() : null;
      const telefone = cliente.telefone ? String(cliente.telefone).trim() : null;
      const nome = String(cliente.nome).trim();

      // Upsert do cliente (por documento, depois por nome).
      let clienteId: string | null = null;
      try {
        let cli: any = null;
        if (documento) {
          const { data } = await getSupabase().from('clients').select('id').eq('tax_id', documento).maybeSingle();
          cli = data;
        }
        if (!cli) {
          const { data } = await getSupabase().from('clients').select('id').eq('name', nome).maybeSingle();
          cli = data;
        }
        if (cli) {
          clienteId = cli.id;
        } else {
          const { data: novo } = await getSupabase().from('clients').insert({
            name: nome,
            tax_id: documento,
            email: cliente.email || null,
            phone: telefone,
            address_cep: end.cep || null,
            address_street: end.logradouro || null,
            address_number: end.numero || null,
            address_complement: end.complemento || null,
            address_neighborhood: end.bairro || null,
            address_city: end.cidade || null,
            address_state: end.uf || null,
            source: 'datacrazy',
          }).select('id').single();
          clienteId = novo?.id || null;
        }
      } catch (e: any) {
        console.warn("[Integração] Falha ao upsert cliente:", e?.message);
      }

      // Mapeia os itens do parceiro para o formato interno do pedido.
      const items = itens.map((it: any) => ({
        templateId: '',
        shirtType: it.descricao || it.produto || 'Produto',
        quantity: Number(it.quantidade) || 1,
        fabricType: it.tecido || '',
        fabricColor: it.cor || '',
        color: it.cor || '',
        size: it.tamanho || '',
        unitPrice: it.preco_unitario != null ? Number(it.preco_unitario) : DEFAULT_UNIT_PRICE,
        fabricUsagePerUnit: 0,
        totalFabricEstimate: 0,
        observacao: it.observacao || undefined,
      }));

      const baseOrder: any = {
        customer_name: nome,
        customer_email: cliente.email || null,
        customer_tax_id: documento,
        customer_phone: telefone,
        customer_address: enderecoStr,
        items,
        status: statusPedido,
        status_started_at: new Date().toISOString(),
        delivery_date: data_entrega || null,
        is_delayed: false,
        nfe_issued: false,
      };
      const fullOrder = { ...baseOrder, external_ref: referencia_externa ? String(referencia_externa) : null, notes: observacoes || null };

      // Tenta inserir com external_ref/notes; se as colunas ainda não existem
      // (migração não aplicada), reinsere sem elas para não travar a integração.
      let pedido: any = null;
      let insErr: any = null;
      {
        const r = await getSupabase().from('orders').insert(fullOrder).select('id, status').single();
        pedido = r.data; insErr = r.error;
      }
      if (insErr && /external_ref|notes|column/i.test(insErr.message || '')) {
        console.warn("[Integração] Colunas external_ref/notes ausentes — rode a migração. Inserindo sem elas.");
        const r = await getSupabase().from('orders').insert(baseOrder).select('id, status').single();
        pedido = r.data; insErr = r.error;
      }
      // Violação de unicidade (referência externa concorrente) -> devolve o existente.
      if (insErr && /duplicate key|23505/i.test(insErr.message || '') && referencia_externa) {
        const { data: existente } = await getSupabase().from('orders').select('id, status').eq('external_ref', String(referencia_externa)).maybeSingle();
        if (existente) return res.status(200).json({ ok: true, duplicado: true, pedido_id: existente.id, status: existente.status });
      }
      if (insErr || !pedido) throw (insErr || new Error("Falha ao criar o pedido."));

      return res.status(201).json({ ok: true, duplicado: false, pedido_id: pedido.id, cliente_id: clienteId, status: pedido.status });
    } catch (error: any) {
      console.error("[Integração] Erro ao criar pedido:", error);
      return res.status(500).json({ ok: false, erro: error?.message || "Erro ao criar o pedido." });
    }
  });

  // Mudança de status do pedido (dispara webhook de saída).
  // O frontend chama este endpoint em vez de escrever direto no Supabase.
  app.post("/api/orders/status", async (req, res) => {
    try {
      const { orderId, status } = req.body;
      const validos = ['pending', 'cutting', 'sewing', 'finishing', 'delivered'];
      if (!orderId || !validos.includes(status)) {
        return res.status(400).json({ mensagem: "orderId e status válido são obrigatórios." });
      }

      const { data: pedido } = await getSupabase().from('orders').select('*').eq('id', orderId).maybeSingle();
      if (!pedido) return res.status(404).json({ mensagem: "Pedido não encontrado." });

      const statusAnterior = pedido.status;
      await getSupabase().from('orders')
        .update({ status, status_started_at: new Date().toISOString() })
        .eq('id', orderId);

      if (statusAnterior !== status) {
        await dispararWebhook('pedido.status_alterado', {
          pedido_id: orderId,
          cliente: clientePayload(pedido),
          status_anterior: statusAnterior,
          status_anterior_label: LABEL_PEDIDO[statusAnterior] || statusAnterior,
          status_novo: status,
          status_novo_label: LABEL_PEDIDO[status] || status,
          data_entrega: pedido.delivery_date || null,
          valor_total: valorTotalPedido(pedido),
        });
      }

      res.json({ ok: true });
    } catch (error: any) {
      console.error("[Orders] Erro ao mudar status:", error);
      res.status(500).json({ mensagem: error?.message || "Erro ao atualizar o status do pedido." });
    }
  });

  // Reconciliação: reconsulta na Focus todas as notas presas em "processando"
  // e sincroniza o banco. Substitui, sob demanda, o job de background que só
  // roda no servidor standalone (na Vercel serverless não há setInterval).
  app.post("/api/nfe/reconcile", async (_req, res) => {
    try {
      if (!FOCUS_TOKEN) return res.status(500).json({ mensagem: "Token do FocusNFe não configurado." });
      const { data: pendentes } = await getSupabase()
        .from('notas_fiscais')
        .select('*')
        .eq('status', 'processando');

      let atualizadas = 0;
      for (const nfe of (pendentes || [])) {
        try {
          const p = await consultarNfe(nfe.ref);
          if (p.status && p.status !== 'processando_autorizacao') {
            await aplicarRetornoNfe(nfe.ref, nfe.pedido_id, p);
            atualizadas++;
          }
        } catch (err: any) {
          console.warn(`[FocusNFe] Reconcile falhou para ${nfe.ref}:`, err.message);
        }
      }
      res.json({ ok: true, verificadas: (pendentes || []).length, atualizadas });
    } catch (error: any) {
      res.status(500).json({ mensagem: error?.message || "Erro ao reconciliar notas." });
    }
  });

  // Diagnóstico: lista as notas fiscais (sem dados sensíveis) para depuração.
  app.get("/api/nfe/debug", async (_req, res) => {
    try {
      const { data } = await getSupabase()
        .from('notas_fiscais')
        .select('id,pedido_id,ref,status,numero,serie,ambiente,mensagem_erro,created_at,updated_at')
        .order('created_at', { ascending: false });
      res.json({ total: data?.length || 0, notas: data || [] });
    } catch (error: any) {
      res.status(500).json({ mensagem: error?.message || "Erro ao consultar notas." });
    }
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
        await dispararWebhook('nfe.status_alterado', {
          pedido_id: orderId, ref, status: 'erro', status_label: LABEL_NFE.erro,
          mensagem_erro: mensagem, cliente: clientePayload(order), valor_total: valorTotalPedido(order),
        });
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

      // Mantém o registro como 'cancelado' (histórico + tag no card / tela de NFs).
      // A reemissão remove esta nota (ver bloco de idempotência do /emit) e cria
      // uma nova com nova referência.
      await getSupabase().from('notas_fiscais').update({
        status: 'cancelado',
        mensagem_erro: null,
        updated_at: new Date().toISOString(),
      }).eq('id', nfe.id);
      await getSupabase().from('orders').update({ nfe_issued: false }).eq('id', orderId);
      const { data: pedidoCancel } = await getSupabase().from('orders').select('*').eq('id', orderId).maybeSingle();
      await dispararWebhook('nfe.status_alterado', {
        pedido_id: orderId, ref: nfe.ref, status: 'cancelado', status_label: LABEL_NFE.cancelado,
        numero: nfe.numero || null, cliente: pedidoCancel ? clientePayload(pedidoCancel) : null,
        valor_total: pedidoCancel ? valorTotalPedido(pedidoCancel) : null,
      });
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
