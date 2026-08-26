// Função serverless da Vercel que expõe a API de NF-e.
// O vercel.json roteia /api/(.*) para cá; o Express resolve a rota internamente.
import { createApiApp } from "../apiApp";

const app = createApiApp();

// Wrapper robusto: se a Vercel entregar a URL sem o prefixo "/api"
// (comportamento varia conforme o roteamento), reconstitui o caminho para o
// Express casar as rotas "/api/nfe/*". Não afeta o servidor local.
export default function handler(req: any, res: any) {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  return app(req, res);
}
