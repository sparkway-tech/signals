import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import onboardingRouter from "./routes/onboarding";
import meRouter from "./routes/me";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

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
