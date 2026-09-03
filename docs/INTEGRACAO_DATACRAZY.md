# Integração de Pedidos — Akanni Confecções

**Documento para o time de integração do Data Crazy**
Versão 1.0

Este documento descreve como o Data Crazy envia **pedidos e dados de clientes**
para o sistema da Akanni Confecções. A cada pedido fechado no WhatsApp/CRM, o
Data Crazy faz **uma chamada HTTP** para o endpoint abaixo, e o sistema cria
automaticamente o **cliente** e o **pedido**.

---

## 1. Informações gerais

| Item | Valor |
|---|---|
| **Base URL (produção)** | `https://akanni-beta.vercel.app` |
| **Formato** | JSON (`Content-Type: application/json`) |
| **Autenticação** | Header `X-API-Key: <CHAVE>` em toda requisição |
| **Charset** | UTF-8 |

> A **chave de API** (`X-API-Key`) será fornecida pela Akanni separadamente
> deste documento (por canal seguro). Ela identifica e autoriza o Data Crazy.

---

## 2. Teste de conexão

Antes de integrar, valide a chave com um `GET`:

```
GET https://akanni-beta.vercel.app/api/integracao/ping
Headers:
  X-API-Key: <CHAVE>
```

**Resposta 200 (OK):**
```json
{ "ok": true, "mensagem": "Autenticado com sucesso.", "ambiente": "sandbox" }
```
Se a chave estiver errada/ausente, retorna **401**.

---

## 3. Criar um pedido

```
POST https://akanni-beta.vercel.app/api/integracao/pedidos
Headers:
  X-API-Key: <CHAVE>
  Content-Type: application/json
```

### 3.1. Corpo da requisição

```json
{
  "referencia_externa": "DC-000123",
  "cliente": {
    "nome": "Maria Silva",
    "telefone": "(11) 98888-7777",
    "email": "maria@email.com",
    "documento": "123.456.789-00",
    "endereco": {
      "cep": "01001-000",
      "logradouro": "Rua das Flores",
      "numero": "100",
      "complemento": "Apto 21",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "uf": "SP"
    }
  },
  "itens": [
    {
      "descricao": "Camiseta Polo",
      "quantidade": 10,
      "tamanho": "M",
      "cor": "Azul",
      "preco_unitario": 85.00,
      "observacao": "Estampa no bolso"
    }
  ],
  "data_entrega": "2026-09-15",
  "observacoes": "Pedido fechado via WhatsApp",
  "status": "pending"
}
```

### 3.2. Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|:---:|---|
| `referencia_externa` | string | Recomendado | ID do pedido no Data Crazy. Usado para **idempotência** (evita duplicar se houver reenvio). |
| `cliente.nome` | string | **Sim** | Nome/razão social do cliente. |
| `cliente.telefone` | string | Recomendado | Telefone/WhatsApp do cliente. |
| `cliente.email` | string | Não | E-mail do cliente. |
| `cliente.documento` | string | Não* | CPF ou CNPJ. *Obrigatório se o pedido for gerar **NF-e**. |
| `cliente.endereco.cep` | string | Não | CEP. |
| `cliente.endereco.logradouro` | string | Não | Rua/av. |
| `cliente.endereco.numero` | string | Não | Número. |
| `cliente.endereco.complemento` | string | Não | Complemento. |
| `cliente.endereco.bairro` | string | Não | Bairro. |
| `cliente.endereco.cidade` | string | Não | Cidade. |
| `cliente.endereco.uf` | string (2) | Não | UF (ex.: `SP`). |
| `itens` | array | **Sim** | Lista com ao menos 1 item. |
| `itens[].descricao` | string | **Sim** | Nome/descrição do produto. |
| `itens[].quantidade` | número | **Sim** | Quantidade (inteiro > 0). |
| `itens[].tamanho` | string | Não | Ex.: `P`, `M`, `G`. |
| `itens[].cor` | string | Não | Cor/detalhes. |
| `itens[].preco_unitario` | número | Não | Preço unitário (R$). Se omitido, usa o padrão do sistema. |
| `itens[].observacao` | string | Não | Observação do item. |
| `data_entrega` | string (data) | Não | Data estimada de entrega, formato `AAAA-MM-DD`. |
| `observacoes` | string | Não | Observações gerais do pedido. |
| `status` | string | Não | Status inicial. Padrão `pending`. Valores: `pending`, `cutting`, `sewing`, `finishing`, `delivered`. |

### 3.3. Respostas

**201 Created — pedido criado:**
```json
{
  "ok": true,
  "duplicado": false,
  "pedido_id": "9f8c...-uuid",
  "cliente_id": "1a2b...-uuid",
  "status": "pending"
}
```

**200 OK — já existia (mesma `referencia_externa`):**
```json
{
  "ok": true,
  "duplicado": true,
  "pedido_id": "9f8c...-uuid",
  "status": "pending",
  "mensagem": "Pedido já existente para esta referência externa."
}
```

**Erros:**
| HTTP | Corpo | Quando |
|---|---|---|
| `400` | `{ "ok": false, "erro": "cliente.nome é obrigatório." }` | Payload inválido (falta `cliente.nome` ou `itens`). |
| `401` | `{ "ok": false, "erro": "X-API-Key inválida ou ausente." }` | Chave de API incorreta/ausente. |
| `500` | `{ "ok": false, "erro": "..." }` | Erro interno. Recomenda-se **retry** com backoff. |

---

## 4. Boas práticas

- **Idempotência:** envie sempre `referencia_externa` (o ID do pedido de vocês).
  Se a mesma referência for reenviada, **não** criamos pedido duplicado —
  devolvemos o existente com `"duplicado": true`.
- **Retentativas:** em caso de timeout ou `5xx`, refaça a chamada (com a mesma
  `referencia_externa`) usando backoff exponencial. É seguro por causa da
  idempotência.
- **Telefone:** pode enviar formatado (`(11) 98888-7777`) ou só dígitos; o
  sistema normaliza.
- **NF-e:** para o pedido conseguir emitir nota fiscal depois, envie o
  `cliente.documento` (CPF/CNPJ) e o endereço.

---

## 5. Exemplo (cURL)

```bash
curl -X POST https://akanni-beta.vercel.app/api/integracao/pedidos \
  -H "X-API-Key: SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "referencia_externa": "DC-000123",
    "cliente": { "nome": "Maria Silva", "telefone": "(11) 98888-7777", "documento": "123.456.789-00" },
    "itens": [ { "descricao": "Camiseta Polo", "quantidade": 10, "tamanho": "M", "cor": "Azul", "preco_unitario": 85.00 } ],
    "data_entrega": "2026-09-15"
  }'
```

---

## 6. (Opcional) Eventos de volta — Akanni → Data Crazy

O sistema Akanni **também pode notificar** o Data Crazy quando um pedido ou uma
nota fiscal muda de status (via webhook de saída). Se o Data Crazy quiser
receber esses eventos, basta informar a URL de recebimento. Eventos:

- `pedido.status_alterado` — ex.: Costura → Acabamento → Despachado.
- `nfe.status_alterado` — nota emitida / erro / cancelada (com link da DANFE).

Exemplo de payload enviado:
```json
{
  "evento": "pedido.status_alterado",
  "dados": {
    "pedido_id": "...",
    "cliente": { "nome": "Maria Silva", "telefone_e164": "5511988887777", "email": "..." },
    "status_novo": "finishing",
    "status_novo_label": "Acabamento",
    "valor_total": 850.00
  }
}
```

---

*Dúvidas sobre a integração: falar com o time da Akanni Confecções.*
