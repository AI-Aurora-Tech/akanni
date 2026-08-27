import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApiApp, runPollingOnce } from "./api/index";

// Servidor standalone (desenvolvimento local e hosts Node como Render/Railway).
// Na Vercel a API roda como função serverless em api/index.ts (ver vercel.json).
async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Rede de segurança: reconsulta notas presas em "processando" a cada 5 min.
  setInterval(runPollingOnce, 5 * 60000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
