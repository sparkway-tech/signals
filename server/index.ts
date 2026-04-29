import express from "express";
import cookieParser from "cookie-parser";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check (utilisé par Vercel + dev)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// TODO semaine 1 — auth magic link
// TODO semaine 1 — onboarding

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`[signals] dev API ready on http://localhost:${PORT}`);
  });
}

export default app;
