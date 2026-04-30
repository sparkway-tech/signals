/**
 * Listes des options d'onboarding.
 * Source : design-reference/data.jsx mockData.onboarding (étendu pour
 * couvrir les expertises tech larges, pas uniquement sales).
 *
 * Ces valeurs alimentent les chips. Elles sont stockées dans
 * users.sectors / functions / regions en JSONB côté DB.
 */

export const ONBOARDING_SECTORS = [
  "SaaS B2B",
  "Fintech",
  "Healthtech",
  "E-commerce",
  "Cybersecurity",
  "AI/Data",
  "Industrial Tech",
  "Hardware/IoT",
  "Other",
] as const;

/**
 * Fonctions élargies aux principales expertises tech.
 * Regroupées mentalement en : Sales / Marketing / Tech / Product /
 * Customer (présentées en flat list dans l'UI pour simplicité).
 */
export const ONBOARDING_FUNCTIONS = [
  // Sales
  "Sales (AE / SDR / Sales Manager)",
  "Sales Leadership (VP Sales / CRO)",
  "Customer Success",
  // Marketing
  "Marketing (Growth / Brand / Content)",
  "Product Marketing",
  "Marketing Leadership (CMO / Head of)",
  // Tech
  "Software Engineering",
  "Engineering Leadership (EM / CTO / VP Eng)",
  "Data / ML / AI",
  "DevOps / SRE / Infra",
  // Product & Design
  "Product Management",
  "Product Leadership (Head / VP Product)",
  "Product Design / UX",
  // Other
  "Other",
] as const;

export const ONBOARDING_REGIONS = [
  "Île-de-France",
  "Lyon/Rhône-Alpes",
  "Bordeaux/Sud-Ouest",
  "Marseille/PACA",
  "Lille/Nord",
  "Nantes/Ouest",
  "Toulouse",
  "Remote France",
  "International",
] as const;
