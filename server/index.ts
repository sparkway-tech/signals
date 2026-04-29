import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import onboardingRouter from "./routes/onboarding";
import meRouter from "./routes/me";
import { runStartupMigrations } from "./lib/migrations";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Migrations au premier cold start. Idempotent + cached pour ne run qu'une
// fois par instance. Bloque la première requête (~50ms warm, ~500ms cold).
let migrationsPromise: Promise<void> | null = null;
app.use(async (_req, _res, next) => {
  if (!migrationsPromise) {
    migrationsPromise = runStartupMigrations().catch((err) => {
      console.error("[startup-migrations] failed:", err);
      // Reset pour permettre un retry au prochain request
      migrationsPromise = null;
      throw err;
    });
  }
  try {
    await migrationsPromise;
    next();
  } catch (err) {
    next(err);
  }
});

// Health check (utilisé par Vercel + dev)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/me", meRouter);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`[signals] dev API ready on http://localhost:${PORT}`);
  });
}

export default app;
