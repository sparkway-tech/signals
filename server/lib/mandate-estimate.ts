/**
 * Calcul du potentiel mandat — pure arithmétique.
 * Source : SIGNALS_SPARKWAY.md §7 "Prompt 3 : Calcul du potentiel mandat".
 *
 * Pour chaque job : salary × fee = mandate. Total ± 15% pour estimateMin/Max.
 */

import type { Job, JobLevel } from "@shared/schema";

const FEES_BY_LEVEL: Record<JobLevel, number> = {
  junior: 0.18,
  mid: 0.20,
  senior: 0.23,
  head: 0.25,
  vp: 0.27,
};

// Salaires en milliers d'euros, par fonction × niveau.
// Calibré sur le marché tech sales / tech product / tech engineering France 2026.
const SALARY_BY_FUNCTION_LEVEL: Record<string, Partial<Record<JobLevel, number>>> = {
  // Sales
  account_executive: { junior: 50, mid: 75, senior: 110, head: 140, vp: 170 },
  sdr: { junior: 38, mid: 50 },
  sales_manager: { mid: 90, senior: 120, head: 150 },
  sales_engineer: { mid: 70, senior: 95, head: 120 },
  customer_success: { junior: 42, mid: 60, senior: 85, head: 110 },
  // Marketing
  marketing: { junior: 42, mid: 60, senior: 85, head: 110, vp: 140 },
  product_marketing: { mid: 70, senior: 95, head: 120 },
  // Engineering
  software_engineer: { junior: 50, mid: 75, senior: 105, head: 140, vp: 170 },
  engineering_manager: { mid: 100, senior: 130, head: 160, vp: 190 },
  data_engineer: { mid: 80, senior: 110, head: 140 },
  devops: { mid: 80, senior: 110, head: 140 },
  // Product
  product_manager: { junior: 50, mid: 75, senior: 105, head: 140, vp: 170 },
  product_design: { junior: 45, mid: 65, senior: 95, head: 120 },
  // Generic fallback
  other: { junior: 45, mid: 65, senior: 90, head: 120, vp: 150 },
};

const FALLBACK_SALARY = 80; // milliers €

export interface MandateBreakdownItem {
  role: string; // ex : "3 postes Senior AE"
  salary: number; // milliers €
  rate: number; // ex : 0.23
  mandate: number; // milliers €, salary × rate × count
}

export interface MandateEstimateResult {
  estimateMin: number; // milliers €
  estimateMax: number; // milliers €
  breakdown: MandateBreakdownItem[];
}

export function computeMandateEstimate(jobs: Job[]): MandateEstimateResult {
  const activeJobs = jobs.filter((j) => !j.closedAt);

  // Group by (function, level) — résumé en breakdown items
  const groups = new Map<string, { jobs: Job[]; salary: number; rate: number }>();

  for (const j of activeJobs) {
    const fn = j.function ?? "other";
    const level = j.level ?? "mid";
    const key = `${fn}::${level}`;
    const salary = SALARY_BY_FUNCTION_LEVEL[fn]?.[level as JobLevel] ?? FALLBACK_SALARY;
    const rate = FEES_BY_LEVEL[level as JobLevel] ?? 0.2;
    const existing = groups.get(key);
    if (existing) {
      existing.jobs.push(j);
    } else {
      groups.set(key, { jobs: [j], salary, rate });
    }
  }

  const breakdown: MandateBreakdownItem[] = [];
  let totalMin = 0;
  let totalMax = 0;

  for (const [key, group] of groups) {
    const [fn, level] = key.split("::");
    const count = group.jobs.length;
    const mandatePerJob = group.salary * group.rate; // milliers €
    const mandateGroup = mandatePerJob * count;
    breakdown.push({
      role: `${count} poste${count > 1 ? "s" : ""} ${level} ${prettyFunction(fn ?? "other")}`,
      salary: group.salary,
      rate: group.rate,
      mandate: Math.round(mandateGroup),
    });
    totalMin += mandateGroup;
    totalMax += mandateGroup;
  }

  return {
    estimateMin: Math.round(totalMin * 0.85),
    estimateMax: Math.round(totalMax * 1.15),
    breakdown,
  };
}

function prettyFunction(fn: string): string {
  switch (fn) {
    case "account_executive":
      return "AE";
    case "sdr":
      return "SDR";
    case "sales_manager":
      return "Sales Mgr";
    case "sales_engineer":
      return "Sales Eng";
    case "customer_success":
      return "CS";
    case "marketing":
      return "Marketing";
    case "product_marketing":
      return "PMM";
    case "software_engineer":
      return "Eng";
    case "engineering_manager":
      return "Eng Mgr";
    case "data_engineer":
      return "Data Eng";
    case "devops":
      return "DevOps";
    case "product_manager":
      return "PM";
    case "product_design":
      return "Designer";
    default:
      return "Autre";
  }
}
