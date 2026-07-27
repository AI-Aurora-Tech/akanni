const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldWebhook = `app.post("/api/nfe/webhook", async (req, res) => {
    const payload = req.body;
    console.log("[FocusNFe] Webhook received:", payload.ref);
    
    // Responder 200 rápido para FocusNFe
    res.status(200).send("OK");`;

const newWebhook = `app.post("/api/nfe/webhook", async (req, res) => {
    const WEBHOOK_SECRET = process.env.FOCUS_NFE_WEBHOOK_SECRET;
    
    // Verificação simples de secret
    if (WEBHOOK_SECRET && req.query.secret !== WEBHOOK_SECRET) {
      console.warn("[FocusNFe] Webhook Unauthorized access attempt");
      return res.status(401).send("Unauthorized");
    }

    const payload = req.body;
    console.log("[FocusNFe] Webhook received:", payload.ref);
    
    // Responder 200 rápido para FocusNFe
    res.status(200).send("OK");`;

code = code.replace(oldWebhook, newWebhook);
fs.writeFileSync('server.ts', code);
