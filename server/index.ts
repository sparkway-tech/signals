import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import onboardingRouter from "./routes/onboarding";
import meRouter from "./routes/me";
import templatesRouter from "./routes/templates";
import searchRouter from "./routes/search";
import companiesRouter from "./routes/companies";
import creditsRouter from "./routes/credits";
import stripeWebhookRouter from "./routes/stripe-webhook";
import cronRouter from "./routes/cron";
import { runStartupMigrations } from "./lib/migrations";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Stripe webhook : raw body REQUIRED (signature verification).
// Mount BEFORE express.json() qui parserait le body en JSON.
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookRouter);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Migrations au premier cold start.
let migrationsPromise: Promise<void> | null = null;
app.use(async (_req, _res, next) => {
  if (!migrationsPromise) {
    migrationsPromise = runStartupMigrations().catch((err) => {
      console.error("[startup-migrations] failed:", err);
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

// Health
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/me", meRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/search", searchRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/credits", creditsRouter);
app.use("/api/cron", cronRouter);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`[signals] dev API ready on http://localhost:${PORT}`);
  });
}

export default app;
