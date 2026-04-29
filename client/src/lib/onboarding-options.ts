/**
 * Listes des options d'onboarding.
 * Source : design-reference/data.jsx mockData.onboarding.
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

export const ONBOARDING_FUNCTIONS = [
  "Account Executive",
  "Sales Manager / Head of Sales",
  "SDR / BDR",
  "VP Sales / CRO",
  "Customer Success",
  "Sales Engineer",
  "Sales Operations",
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
