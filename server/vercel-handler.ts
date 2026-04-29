/**
 * Vercel serverless entry — wraps the Express app.
 * `vite build` produit le bundle client dans dist/public/, et Vercel sert
 * automatiquement les statiques. Cette handler ne gère que /api/*.
 */
import app from "./index";

export default app;
