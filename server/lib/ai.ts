/**
 * Prompts AI Anthropic.
 * Source : SIGNALS_SPARKWAY.md §7.
 *
 * Modèle : claude-haiku-4-5 (rapide + ~15× moins cher qu'Opus, qualité
 * suffisante pour les 4 lignes de reco et les 2-3 phrases d'angle).
 * Si ANTHROPIC_API_KEY manque → on no-op (renvoie null pour laisser le
 * fallback côté front afficher "non générée").
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Company, Job, DecisionMaker, CompanyScore } from "@shared/schema";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (cachedClient) return cachedClient;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

const MODEL = "claude-haiku-4-5-20251001";

export async function generateRecommendation(
  company: Company,
  score: CompanyScore,
  activeJobs: Job[],
  decisionMakers: DecisionMaker[],
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `Tu es un expert du recrutement tech en France. Tu analyses une boîte qui recrute pour un consultant en cabinet de recrutement.

Voici les données de la boîte :
- Nom : ${company.name}
- Secteur : ${company.sectorPrecise ?? company.sector ?? "Tech"}
- Effectif : ${company.employeeCount ?? "Non renseigné"}
- Stade : ${company.fundingStage ?? "Non renseigné"}, dernière levée : ${company.lastFundingAmount ? `${company.lastFundingAmount}M€` : "N/A"} (${company.lastFundingDate ?? "N/A"})
- Score d'urgence : ${score.score}/100

Postes actifs (${activeJobs.length}) :
${activeJobs.map((j) => `- ${j.title} (${j.level ?? "mid"}), publié ${new Date(j.publishedAt).toLocaleDateString("fr-FR")}, republié ${j.republicationCount}x`).join("\n")}

Décideurs identifiés :
${decisionMakers.map((d) => `- ${d.fullName} — ${d.titleExact}${d.isRecent ? " (arrivé récemment)" : ""}`).join("\n") || "(aucun pour l'instant)"}

Génère une recommandation stratégique en 4 lignes maximum (≈ 50 mots) qui explique :
1. Pourquoi cette boîte est une opportunité maintenant (signaux convergents)
2. L'angle exclusif que le consultant peut proposer (positionnement vs autres cabinets)

Ton : analyste senior à confrère, factuel, pas de jargon marketing, pas de superlatifs creux. Termine par une phrase d'action concrète.`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[ai/recommendation] failed:", err);
    return null;
  }
}

export async function generateAngleApproach(
  company: Company,
  recommendation: string | null,
  decisionMaker: DecisionMaker,
  jobsRelevantToRole: Job[],
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `Tu génères un angle d'approche pour un consultant cabinet qui veut contacter ce décideur.

Boîte : ${company.name} — ${company.sectorPrecise ?? company.sector ?? "Tech"}
Contexte : ${recommendation ?? "Non disponible."}

Décideur :
- Nom : ${decisionMaker.fullName}
- Titre : ${decisionMaker.titleExact}
- Ancienneté : ${decisionMaker.startedAt ?? "Non renseignée"} (${decisionMaker.isRecent ? "récente" : "établie"})
- LinkedIn : ${decisionMaker.linkedinUrl ?? "Non renseigné"}

Postes ouverts les plus pertinents pour ce décideur :
${jobsRelevantToRole.map((j) => `- ${j.title} (${j.level ?? "mid"})`).join("\n") || "(aucun)"}

Génère un angle d'approche en 2-3 phrases (≈ 40 mots) qui :
1. Identifie un signal personnel ou un contexte spécifique à ce décideur
2. Propose un hook concret (ce que le consultant peut dire en première interaction)

Ton : conseil senior, factuel, observation > argument. Pas de "Bonjour [Prénom]", pas de phrase de vente. Le consultant lira ça et saura quoi faire.`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[ai/angle] failed:", err);
    return null;
  }
}
