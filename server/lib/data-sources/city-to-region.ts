/**
 * Mapping ville/dept → région utilisateur (8 régions du périmètre onboarding).
 *
 * Source : ONBOARDING_REGIONS du client. Match par préfixe (lowercase).
 * Retourne null si non mappable.
 */

const REGION_BY_PREFIX: Array<[RegExp, string]> = [
  // Île-de-France : Paris + petite/grande couronne
  [/^(paris|île-de-france|ile-de-france|hauts-de-seine|seine-saint-denis|val-de-marne|val-d'oise|seine-et-marne|yvelines|essonne|courbevoie|nanterre|boulogne|levallois|neuilly|montreuil|saint-denis|saint-ouen|issy|clichy|puteaux|vincennes|aubervilliers|ivry|montrouge|rueil|versailles)/, "Île-de-France"],
  // Lyon / Rhône-Alpes
  [/^(lyon|grenoble|saint-étienne|saint-etienne|villeurbanne|annecy|chambéry|chambery|valence|rhône-alpes|rhone-alpes|auvergne-rhône|auvergne-rhone)/, "Lyon/Rhône-Alpes"],
  // Bordeaux / Sud-Ouest
  [/^(bordeaux|toulouse|pau|biarritz|bayonne|aquitaine|nouvelle-aquitaine|gironde|sud-ouest|landes)/, "Bordeaux/Sud-Ouest"],
  // Marseille / PACA
  [/^(marseille|aix-en-provence|aix|nice|cannes|antibes|toulon|provence|paca|côte d'azur|cote d'azur|monaco|sophia antipolis)/, "Marseille/PACA"],
  // Lille / Nord
  [/^(lille|roubaix|tourcoing|villeneuve-d'ascq|villeneuve|nord-pas-de-calais|hauts-de-france|amiens|nord)/, "Lille/Nord"],
  // Nantes / Ouest
  [/^(nantes|rennes|brest|angers|le mans|saint-nazaire|pays de la loire|bretagne|loire-atlantique|ouest)/, "Nantes/Ouest"],
  // Toulouse — déjà capté par Sud-Ouest, mais on peut overrider explicit
  // (laissé sous Bordeaux/Sud-Ouest pour rester proche de l'intuition produit)
  // Remote / International / fallback
  [/^(remote|télétravail|teletravail|home office|hybrid)/, "Remote France"],
  [/^(london|berlin|munich|amsterdam|barcelona|madrid|brussels|bruxelles|geneva|genève|zurich|luxembourg|dublin|stockholm|copenhagen|copenhague|new york|san francisco|singapore|singapour|sydney|tokyo)/, "International"],
];

export function cityToRegion(city: string | null | undefined): string | null {
  if (!city) return null;
  const normalized = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [pattern, region] of REGION_BY_PREFIX) {
    if (pattern.test(normalized)) return region;
  }
  return null;
}
