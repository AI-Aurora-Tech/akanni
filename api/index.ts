// Função serverless da Vercel que expõe a API de NF-e.
// O vercel.json roteia /api/(.*) para cá; o Express resolve a rota internamente.
import { createApiApp } from "../apiApp";

const app = createApiApp();

// Wrapper robusto:
// 1) Se a Vercel entregar a URL sem o prefixo "/api" (o roteamento varia),
//    reconstitui o caminho para o Express casar as rotas "/api/nfe/*".
// 2) Captura qualquer erro para devolver JSON legível em vez de derrubar a
//    função (evita o genérico FUNCTION_INVOCATION_FAILED).
export default function handler(req: any, res: any) {
  try {
    if (req.url && !req.url.startsWith("/api")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error("[api] Erro não tratado na função serverless:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ status: "erro", mensagem: err?.message || "Erro interno na função serverless." }));
    }
  }
}
