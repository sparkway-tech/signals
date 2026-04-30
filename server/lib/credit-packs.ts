/**
 * Définition des packs credits.
 * Source : SIGNALS_SPARKWAY.md §2 + design-reference/data.jsx mockData.packs.
 *
 * Les Stripe Price IDs viennent des env vars (configurés depuis le dashboard
 * Stripe) — on les valide à l'usage et on retourne 503 si manquants.
 */
import type { CreditPackType } from "@shared/schema";

export interface CreditPack {
  id: CreditPackType;
  name: string;
  credits: number;
  priceEur: number; // €
  perCreditEur: number;
  tag: string;
  tagTone: "sand" | "sage";
  desc: string;
  envKey: "STRIPE_PRICE_DECOUVERTE" | "STRIPE_PRICE_PRO" | "STRIPE_PRICE_CABINET";
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "decouverte",
    name: "Découverte",
    credits: 30,
    priceEur: 29,
    perCreditEur: 0.97,
    tag: "Beta",
    tagTone: "sand",
    desc: "Pour tester l'outil sur une vague de prospection.",
    envKey: "STRIPE_PRICE_DECOUVERTE",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 100,
    priceEur: 79,
    perCreditEur: 0.79,
    tag: "Recommandé",
    tagTone: "sage",
    desc: "Le rythme d'un consultant qui débloque 4-5 fiches par semaine.",
    envKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "cabinet",
    name: "Cabinet",
    credits: 500,
    priceEur: 299,
    perCreditEur: 0.6,
    tag: "Volume",
    tagTone: "sand",
    desc: "Mutualisé pour une équipe de 3 à 6 consultants.",
    envKey: "STRIPE_PRICE_CABINET",
  },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
