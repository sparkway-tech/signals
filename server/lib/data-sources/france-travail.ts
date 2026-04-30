/**
 * France Travail API client.
 * Doc : https://francetravail.io/data/api/offres-emploi/v2
 *
 * OAuth2 client_credentials → token Bearer → recherche par codes ROME.
 *
 * Codes ROME tech (élargis pour couvrir sales/marketing/tech/product/CS) :
 *  - M1704 : Management relation commerciale
 *  - M1707 : Stratégie commerciale
 *  - D1402 : Relation commerciale grands comptes et entreprises
 *  - D1407 : Relation technico-commerciale
 *  - M1805 : Études et développement informatique
 *  - M1806 : Conseil et maîtrise d'ouvrage en SI
 *  - M1810 : Production et exploitation de SI
 *  - M1402 : Conseil en organisation et management d'entreprise (Product)
 *  - M1701 : Administration des ventes (CS)
 */

const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

const ROME_CODES = ["M1704", "M1707", "D1402", "D1407", "M1805", "M1806", "M1810", "M1402", "M1701"];

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCreds(): { id: string; secret: string } | null {
  const id = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const secret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

async function getToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const creds = getCreds();
  if (!creds) return null;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.id,
    client_secret: creds.secret,
    scope: "api_offresdemploiv2 o2dsoffre",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    console.error("[ft] token failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as TokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export interface FranceTravailJob {
  id: string;
  intitule: string;
  description?: string;
  entreprise: { nom?: string };
  lieuTravail: { libelle?: string; commune?: string; codePostal?: string };
  romeCode: string;
  romeLibelle: string;
  dateCreation: string;
  origineOffre?: { urlOrigine?: string };
}

interface FranceTravailResponse {
  resultats: FranceTravailJob[];
}

/**
 * Fetch les annonces tech sur France Travail.
 * Boucle sur les codes ROME, dédup par id.
 */
export async function fetchFranceTravailJobs(maxPerCode = 100): Promise<FranceTravailJob[]> {
  const token = await getToken();
  if (!token) {
    console.warn("[ft] no token — skip");
    return [];
  }

  const seen = new Set<string>();
  const all: FranceTravailJob[] = [];

  for (const code of ROME_CODES) {
    const url = `${SEARCH_URL}?codeROME=${code}&range=0-${maxPerCode - 1}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        console.warn(`[ft] ${code} → ${res.status}`);
        // 1 req/sec rate limit
        await new Promise((r) => setTimeout(r, 1100));
        continue;
      }
      const data = (await res.json()) as FranceTravailResponse;
      for (const job of data.resultats ?? []) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          all.push(job);
        }
      }
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      console.error(`[ft] ${code} failed:`, err);
    }
  }

  console.log(`[ft] fetched ${all.length} unique jobs across ${ROME_CODES.length} ROME codes`);
  return all;
}
