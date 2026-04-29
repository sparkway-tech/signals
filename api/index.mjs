// server/index.ts
import express from "express";
import cookieParser from "cookie-parser";
var app = express();
var PORT = Number(process.env.PORT ?? 3e3);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: (/* @__PURE__ */ new Date()).toISOString() });
});
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`[signals] dev API ready on http://localhost:${PORT}`);
  });
}
var index_default = app;

// server/vercel-handler.ts
var vercel_handler_default = index_default;
export {
  vercel_handler_default as default
};
