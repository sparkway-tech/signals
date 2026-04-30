/**
 * Templates de recherche prédéfinis.
 * Source : SIGNALS_SPARKWAY.md §4 + design-reference/data.jsx mockData.templates.
 *
 * Les templates ne stockent pas de données spécifiques à l'utilisateur ;
 * ils définissent juste un set de filtres serveur. Le compteur dynamique
 * est calculé à chaque GET /api/templates en intersectant avec le
 * périmètre user.
 */
import type { SearchTemplate } from "@shared/schema";

export interface TemplateDef {
  id: SearchTemplate;
  title: string;
  desc: string;
  filters: {
    fundingStages?: string[];
    minRepublicationCount?: number;
    minActiveJobs?: number;
    fundingMaxMonths?: number;
    sizeBuckets?: string[]; // employee_count buckets
  };
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "scaleups_hypercroissance",
    title: "Scale-ups en hyper-croissance",
    desc: "Boîtes série B/C qui staffent leurs équipes commerciales et tech. Friction de sourcing élevée.",
    filters: {
      fundingStages: ["series_b", "series_c", "late_stage"],
      minActiveJobs: 3,
    },
  },
  {
    id: "galere_recruter",
    title: "Boîtes qui galèrent à recruter",
    desc: "Annonces ouvertes depuis plus de 45 jours, republiées au moins 2 fois.",
    filters: {
      minRepublicationCount: 2,
    },
  },
  {
    id: "levees_recentes",
    title: "Levées récentes",
    desc: "Boîtes qui ont closé une levée et qui staffent leur Go-to-Market.",
    filters: {
      fundingMaxMonths: 12,
      minActiveJobs: 2,
    },
  },
  {
    id: "midmarket_ouverture",
    title: "Mid-Market en ouverture",
    desc: "PME 50-200 personnes qui structurent leurs fonctions commerciales et tech pour la première fois.",
    filters: {
      sizeBuckets: ["50-200"],
      minActiveJobs: 1,
    },
  },
];

export function getTemplateById(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
