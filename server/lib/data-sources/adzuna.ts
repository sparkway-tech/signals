/**
 * Adzuna API client.
 * Doc : https://developer.adzuna.com/
 * Country : fr.
 *
 * On collecte les annonces tech (sales, marketing, tech, product, data, CS).
 * Filtré par mots-clés ; les ROME codes ne sont pas dispo sur Adzuna.
 */

const BASE = "https://api.adzuna.com/v1/api/jobs/fr";

const TECH_KEYWORDS = [
  // Sales
  "Account Executive",
  "Sales Manager",
  "Head of Sales",
  "VP Sales",
  "SDR",
  "BDR",
  "Customer Success",
  "Sales Engineer",
  // Marketing
  "Growth Manager",
  "Head of Marketing",
  "CMO",
  "Product Marketing",
  // Tech
  "Software Engineer",
  "Engineering Manager",
  "VP Engineering",
  "CTO",
  "DevOps",
  "Data Engineer",
  "Machine Learning",
  // Product
  "Product Manager",
  "Head of Product",
  "VP Product",
  "Product Designer",
];

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  created: string; // ISO date
  redirect_url: string;
  category: { tag: string; label: string };
}

interface AdzunaResponse {
  count: number;
  results: AdzunaJob[];
}

function getCreds(): { appId: string; appKey: string } | null {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return null;
  return { appId, appKey };
}

async function fetchAdzunaPage(
  creds: { appId: string; appKey: string },
  keyword: string,
  page: number,
): Promise<AdzunaJob[]> {
  const url = `${BASE}/search/${page}?app_id=${encodeURIComponent(creds.appId)}&app_key=${encodeURIComponent(creds.appKey)}&results_per_page=50&what=${encodeURIComponent(keyword)}&content-type=application/json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[adzuna] ${keyword} p${page} → ${res.status}`);
      return [];
    }
    const data = (await res.json()) as AdzunaResponse;
    return data.results ?? [];
  } catch (err) {
    console.error(`[adzuna] ${keyword} p${page} fetch failed:`, err);
    return [];
  }
}

/**
 * Fetch les annonces tech sur Adzuna FR. Parallélisé par chunks de 6
 * pour ne pas saturer leur API ni notre IP. Dédup par id.
 */
export async function fetchAdzunaTechJobs(maxPagesPerKeyword = 1): Promise<AdzunaJob[]> {
  const creds = getCreds();
  if (!creds) {
    console.warn("[adzuna] credentials missing — skip");
    return [];
  }

  // Build full task list (keyword × page)
  const tasks: Array<{ keyword: string; page: number }> = [];
  for (const keyword of TECH_KEYWORDS) {
    for (let page = 1; page <= maxPagesPerKeyword; page++) {
      tasks.push({ keyword, page });
    }
  }

  const seen = new Set<string>();
  const all: AdzunaJob[] = [];
  const CHUNK = 6;
  for (let i = 0; i < tasks.length; i += CHUNK) {
    const slice = tasks.slice(i, i + CHUNK);
    const results = await Promise.all(slice.map((t) => fetchAdzunaPage(creds, t.keyword, t.page)));
    for (const batch of results) {
      for (const job of batch) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          all.push(job);
        }
      }
    }
  }

  console.log(`[adzuna] fetched ${all.length} unique jobs across ${TECH_KEYWORDS.length} keywords × ${maxPagesPerKeyword} pages`);
  return all;
}

/**
 * Détermine la fonction normalisée à partir du titre.
 */
export function normalizeFunction(title: string): string {
  const t = title.toLowerCase();
  if (/account executive|\bae\b/.test(t)) return "account_executive";
  if (/\bsdr\b|\bbdr\b|sales development|business development/.test(t)) return "sdr";
  if (/sales manager|head of sales|director.*sales/.test(t)) return "sales_manager";
  if (/vp sales|vp.*revenue|cro\b/.test(t)) return "sales_manager";
  if (/sales engineer/.test(t)) return "sales_engineer";
  if (/customer success|csm\b/.test(t)) return "customer_success";
  if (/growth|demand gen|brand|content marketing/.test(t)) return "marketing";
  if (/product marketing|pmm\b/.test(t)) return "product_marketing";
  if (/cmo|head of marketing|vp marketing/.test(t)) return "marketing";
  if (/data engineer|data scientist|machine learning|\bml\b/.test(t)) return "data_engineer";
  if (/devops|sre\b|reliability|infrastructure/.test(t)) return "devops";
  if (/software engineer|developer|frontend|backend|fullstack|full-stack/.test(t)) return "software_engineer";
  if (/engineering manager|head of engineering|vp engineering|\bcto\b/.test(t)) return "engineering_manager";
  if (/product manager|\bpm\b(?!\w)/.test(t)) return "product_manager";
  if (/head of product|vp product|chief product/.test(t)) return "product_manager";
  if (/product designer|ux designer|ui designer/.test(t)) return "product_design";
  return "other";
}

/**
 * Détermine le niveau à partir du titre.
 */
export function normalizeLevel(title: string): "junior" | "mid" | "senior" | "head" | "vp" {
  const t = title.toLowerCase();
  if (/\bvp\b|vice president|chief|cro|cto|cmo|cpo/.test(t)) return "vp";
  if (/head of|director|leader/.test(t)) return "head";
  if (/senior|lead|principal/.test(t)) return "senior";
  if (/junior|entry|graduate|stagiaire/.test(t)) return "junior";
  return "mid";
}
