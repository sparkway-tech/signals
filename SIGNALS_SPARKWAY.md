# claude.md

Document d'implémentation pour Claude Code. À placer à la racine du repo `sparkway-signals` comme `CLAUDE.md` ou conservé séparément en référence.

---

## 1. Contexte produit

**Sparkway Signals** est un outil SaaS de prospection B2B pour cabinets de recrutement spécialisés tech sales en France.

**Promesse** : Trouve les boîtes françaises qui recrutent activement et qui ont besoin d'un cabinet pour y arriver, en quelques minutes au lieu de plusieurs heures de scroll LinkedIn.

**Cible V1** : consultants et BDR de cabinets de recrutement tech sales français (cabinets <20 personnes prioritairement).

**Géographie V1** : France uniquement.

**Modèle économique V1** : credits one-shot via Stripe (pas d'abonnement). Beta payante à 29€ pour 30 credits.

**Mécanique land & expand** :
- Onboarding obligatoire (3 questions : secteurs, fonctions, régions)
- Templates de recherche pré-faits + filtres modifiables
- 1 boîte gratuite affichée intégralement par recherche (le "wow moment")
- Les autres boîtes apparaissent en teaser (logo flouté, score visible, drapeau partiel)
- 1 credit = 1 fiche débloquée

**Stratégie** : Sparkway Signals est un produit indépendant qui peut servir d'entrée pour Sparkway l'ATS plus tard, mais qui doit fonctionner et générer du revenu en standalone.

---

## 2. Architecture technique

**Repo** : `sparkway-signals` (séparé de Sparkway l'ATS)
**Hosting** : Vercel
**Domaine** : `signals.sparkway.work` (CNAME GoDaddy → Vercel)
**Base de données** : Neon PostgreSQL (instance séparée de Sparkway l'ATS)
**Stack** :
- Backend : Node.js + Express (TypeScript strict, no `as any`)
- ORM : Drizzle
- Frontend : React 18 + Vite + Tailwind CSS
- AI : Anthropic SDK (`@anthropic-ai/sdk`) — Claude Sonnet 4.7 par défaut
- Email : Resend (magic link auth + emails transactionnels)
- Paiement : Stripe Checkout + webhooks
- Sources de données : Adzuna API + France Travail API
- Jobs/cron : Vercel Cron (suffisant V1, Inngest si besoin de queues complexes)

**Variables d'environnement obligatoires** (à mettre dans Vercel + .env local) :
```
DATABASE_URL=                # Neon connection string
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=signals@sparkway.work
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_DECOUVERTE=     # Stripe Price ID pour pack 30 credits
STRIPE_PRICE_PRO=            # Stripe Price ID pour pack 100 credits
STRIPE_PRICE_CABINET=        # Stripe Price ID pour pack 500 credits
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
APP_URL=https://signals.sparkway.work
SESSION_SECRET=              # pour signer les magic link tokens
```

---

## 3. Schéma de base de données (Drizzle)

```typescript
// users
{
  id: uuid (pk)
  email: text (unique, not null)
  createdAt: timestamp
  lastLoginAt: timestamp (nullable)
  onboardingCompleted: boolean (default false)
  // périmètre (rempli à l'onboarding)
  sectors: jsonb (array of strings, max 3)
  functions: jsonb (array of strings, max 5)
  regions: jsonb (array of strings)
  // credits
  creditsBalance: integer (default 0)
}

// magic_link_tokens
{
  id: uuid (pk)
  userId: uuid (fk users)
  token: text (unique, hashed)
  expiresAt: timestamp
  usedAt: timestamp (nullable)
  createdAt: timestamp
}

// companies
{
  id: uuid (pk)
  name: text
  slug: text (unique)
  websiteUrl: text (nullable)
  city: text (nullable)
  region: text (nullable)
  sector: text (nullable)
  sectorPrecise: text (nullable)
  employeeCount: integer (nullable)
  fundingStage: text (nullable) // 'bootstrap' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'late_stage' | 'public'
  lastFundingAmount: integer (nullable) // en milliers d'euros
  lastFundingDate: date (nullable)
  ceoName: text (nullable)
  ceoLinkedInUrl: text (nullable)
  pappersId: text (nullable)
  // métadonnées
  firstSeenAt: timestamp
  lastUpdatedAt: timestamp
  dataSourcesUsed: jsonb // ['adzuna', 'france_travail', 'pappers', 'linkedin_public']
}

// jobs (annonces collectées)
{
  id: uuid (pk)
  companyId: uuid (fk companies)
  externalId: text // id de la source
  source: text // 'adzuna' | 'france_travail'
  title: text
  function: text // normalisée : 'account_executive' | 'sdr' | 'sales_manager' etc.
  level: text // 'junior' | 'mid' | 'senior' | 'head' | 'vp'
  city: text (nullable)
  publishedAt: timestamp
  closedAt: timestamp (nullable) // détecté quand l'annonce disparait
  republicationCount: integer (default 0) // incrémenté quand on revoit la même annonce
  url: text
  rawData: jsonb
}

// company_scores (recalculé périodiquement)
{
  id: uuid (pk)
  companyId: uuid (fk companies, unique)
  score: integer // 0-100
  scoreVolume: integer // 0-100
  scorePersistance: integer // 0-100
  scoreRepublication: integer // 0-100
  scoreCroissanceSales: integer // 0-100
  flags: jsonb // [{ type: 'republication', label: '...', severity: 'high' }]
  computedAt: timestamp
}

// decision_makers
{
  id: uuid (pk)
  companyId: uuid (fk companies)
  fullName: text
  role: text // 'ceo' | 'vp_sales' | 'head_of_sales' | 'head_ta' | 'sales_manager' | 'cofounder'
  titleExact: text // ex: "VP Sales France"
  linkedInUrl: text (nullable)
  startedAt: date (nullable) // pour détecter les arrivées récentes
  isRecent: boolean (computed: startedAt < 6 months ago)
  source: text // 'pappers' | 'linkedin_public' | 'manual'
  // angle d'approche (généré par AI)
  angleApproach: text (nullable)
  angleGeneratedAt: timestamp (nullable)
}

// company_recommendations (recommandation Signals AI)
{
  id: uuid (pk)
  companyId: uuid (fk companies, unique)
  recommendation: text
  generatedAt: timestamp
  modelUsed: text // 'claude-sonnet-4-7'
}

// mandate_estimates
{
  id: uuid (pk)
  companyId: uuid (fk companies, unique)
  estimateMin: integer // en milliers d'euros
  estimateMax: integer
  breakdownJson: jsonb // détail par poste
  computedAt: timestamp
}

// company_timeline_events
{
  id: uuid (pk)
  companyId: uuid (fk companies)
  eventDate: date
  eventType: text // 'funding' | 'leadership_change' | 'job_published' | 'job_republished' | 'team_growth'
  description: text
  metadata: jsonb
  sortOrder: integer
}

// searches (recherches effectuées par les users)
{
  id: uuid (pk)
  userId: uuid (fk users)
  templateUsed: text (nullable) // 'scaleups_hypercroissance' | 'galere_recruter' | 'levees_recentes' | 'midmarket_ouverture' | 'custom'
  filters: jsonb // tous les filtres appliqués
  resultCount: integer
  freebieCompanyId: uuid (fk companies, nullable) // la boîte affichée gratuitement
  createdAt: timestamp
}

// search_results (résultats par recherche, pour pouvoir revisiter)
{
  id: uuid (pk)
  searchId: uuid (fk searches)
  companyId: uuid (fk companies)
  rank: integer
  scoreSnapshot: integer // score au moment de la recherche
  flagsSnapshot: jsonb
}

// unlocked_companies (fiches débloquées par les users)
{
  id: uuid (pk)
  userId: uuid (fk users)
  companyId: uuid (fk companies)
  unlockedVia: text // 'freebie' | 'credit'
  creditsCost: integer // 0 pour freebie, 1 pour credit standard
  unlockedAt: timestamp
  markedAsContacted: boolean (default false)
  markedAsContactedAt: timestamp (nullable)
}
// unique constraint sur (userId, companyId)

// credit_transactions
{
  id: uuid (pk)
  userId: uuid (fk users)
  type: text // 'purchase' | 'spend' | 'refund' | 'manual_adjust'
  amount: integer // positif pour purchase, négatif pour spend
  balanceAfter: integer
  // si purchase
  stripeSessionId: text (nullable)
  stripePaymentIntent: text (nullable)
  packType: text (nullable) // 'decouverte' | 'pro' | 'cabinet'
  amountEur: integer (nullable) // en centimes
  // si spend
  unlockedCompanyId: uuid (fk unlocked_companies, nullable)
  // métadonnées
  description: text (nullable)
  createdAt: timestamp
}
```

---

## 4. API endpoints

### Auth (magic link)

**POST `/api/auth/magic-link`**
- Body : `{ email }`
- Génère un token, hash, persiste dans `magic_link_tokens` (TTL 15 min)
- Envoie email via Resend avec lien `${APP_URL}/auth/verify?token=XXX`
- Réponse : `{ ok: true }`

**GET `/api/auth/verify?token=XXX`**
- Vérifie le token (non utilisé, non expiré)
- Marque comme utilisé
- Crée le user s'il n'existe pas
- Set un cookie session signé (JWT ou session simple)
- Redirect vers `/onboarding` si `onboardingCompleted = false`, sinon `/recherche`

**POST `/api/auth/logout`**
- Détruit la session

### Onboarding

**POST `/api/onboarding`**
- Body : `{ sectors: string[], functions: string[], regions: string[] }`
- Validation : sectors max 3, functions max 5, regions au moins 1
- Update user, set `onboardingCompleted = true`
- Réponse : `{ ok: true, user }`

### Recherche

**GET `/api/templates`**
- Retourne les 4 templates avec, pour chaque template, le nombre estimé de boîtes correspondant au périmètre du user connecté
- Calcul fait à la volée par requête sur la base companies

**POST `/api/search`**
- Body : `{ template?: string, filters?: object }`
- Applique le template + filtres + périmètre user (intersection)
- Score les résultats (companyScores joint)
- Sélectionne la "freebie" (la 1ère boîte non encore débloquée par ce user, top score, dans son périmètre)
- Crée un row `searches` + `search_results`
- Marque la freebie comme `unlocked_companies` (via='freebie', creditsCost=0)
- Réponse :
  ```json
  {
    "searchId": "...",
    "totalCount": 47,
    "freebie": { ...full company data with all unlocked details... },
    "teasers": [
      {
        "id": "...",
        "score": 88,
        "scoreLabel": "Très chaud",
        "sector": "SaaS B2B",
        "city": "Paris 9e",
        "employeeCountRange": "200-500",
        "partialFlag": "X postes Sales ouverts" // chiffre flouté côté front
      },
      ...
    ]
  }
  ```

**GET `/api/searches/:searchId`**
- Pour revisiter une recherche

### Fiches

**GET `/api/companies/:companyId`**
- Si user a déjà débloqué la boîte (entrée dans `unlocked_companies`) → retourne tout
- Sinon → 403 avec un payload "À débloquer pour 1 credit"

**POST `/api/companies/:companyId/unlock`**
- Vérifie que `creditsBalance >= 1`
- Transaction DB :
  - Insert `unlocked_companies` (via='credit', creditsCost=1)
  - Decrement `users.creditsBalance`
  - Insert `credit_transactions` (type='spend', amount=-1)
- Réponse : full company data

**POST `/api/companies/:companyId/mark-contacted`**
- Toggle `markedAsContacted` sur `unlocked_companies`

### Paiement

**GET `/api/credits/packs`**
- Retourne les 3 packs avec prix et credits

**POST `/api/credits/checkout`**
- Body : `{ pack: 'decouverte' | 'pro' | 'cabinet' }`
- Crée une session Stripe Checkout :
  - mode: 'payment' (one-shot, pas subscription)
  - line_items : 1 ligne avec le Price ID correspondant
  - success_url : `${APP_URL}/profile?payment=success`
  - cancel_url : `${APP_URL}/profile?payment=cancel`
  - metadata : `{ userId, pack }`
  - customer_email : user.email
- Réponse : `{ checkoutUrl }`

**POST `/api/stripe/webhook`**
- Handler pour les events Stripe (pas de body parser JSON, raw body required)
- Gère :
  - `checkout.session.completed` :
    - Récupère userId + pack depuis metadata
    - Détermine credits à ajouter (30 / 100 / 500)
    - Transaction : increment user.creditsBalance + insert credit_transactions
- Idempotency : check si stripeSessionId existe déjà avant de créditer

### Profil

**GET `/api/me`**
- Retourne user + creditsBalance + onboarding state

**GET `/api/me/transactions`**
- Historique des achats (limit 10)

**GET `/api/me/unlocked`**
- Liste des fiches débloquées (limit 20, ordered by unlockedAt desc)

**PATCH `/api/me/perimeter`**
- Update sectors/functions/regions

---

## 5. Sources de données

### Adzuna API
- Doc : https://developer.adzuna.com/
- Country code : `fr`
- Endpoints utilisés :
  - `/v1/api/jobs/fr/search/{page}` — recherche d'annonces avec filtres (results_per_page max 50)
  - `/v1/api/jobs/fr/top_companies` — boîtes par volume de jobs
- Rate limit gratuit : à valider à l'inscription, prévoir un cache agressif
- Stratégie : un cron quotidien collecte les nouvelles annonces tech sales (mots-clés : "Account Executive", "Sales Manager", "SDR", "BDR", "Head of Sales", "VP Sales", etc.)

### France Travail API
- Doc : https://francetravail.io/
- Authentification OAuth2 (client credentials)
- Endpoint principal : `Offres d'emploi v2 / search`
- Codes ROME pertinents :
  - M1704 : Management relation commerciale
  - M1707 : Stratégie commerciale
  - D1402 : Relation commerciale grands comptes et entreprises
  - D1407 : Relation technico-commerciale
- Rate limit : 1 req/sec

### Pipeline d'ingestion (cron Vercel toutes les 6h)

```typescript
// pseudocode
async function ingestJobs() {
  const adzunaJobs = await fetchAdzunaTechSalesFrance();
  const franceTravailJobs = await fetchFranceTravailTechSales();

  for (const rawJob of [...adzunaJobs, ...franceTravailJobs]) {
    const company = await findOrCreateCompany(rawJob.companyName, rawJob.location);
    const existingJob = await findJobByExternalId(rawJob.id, rawJob.source);

    if (existingJob) {
      // republication detection
      if (existingJob.publishedAt < rawJob.publishedAt) {
        await incrementRepublication(existingJob.id);
        await addTimelineEvent(company.id, 'job_republished', rawJob.title, rawJob.publishedAt);
      }
    } else {
      await createJob(rawJob);
      await addTimelineEvent(company.id, 'job_published', rawJob.title, rawJob.publishedAt);
    }
  }
}
```

### Détection de fermeture d'annonces
Cron quotidien : pour chaque job actif, refetch sur Adzuna/FT. Si plus présent → set `closedAt = now()`.

---

## 6. Pipeline de scoring

Le score d'urgence (0-100) est la moyenne pondérée de 4 sous-scores. Recalculé toutes les 6h par cron pour chaque company avec au moins 1 job actif dans les 90 derniers jours.

### Sous-scores

**1. Score Volume (poids 25%)**
- Mesure le nombre de postes Sales actifs ouverts
- Formule : `min(100, activeJobsCount * 12)`
- 8+ postes = 100, 4 postes = 48, 1 poste = 12

**2. Score Persistance (poids 30%)**
- Mesure depuis combien de temps les annonces sont ouvertes
- Pour chaque job actif : ageInDays (depuis publishedAt)
- Formule : `min(100, avgAgeInDays * 1.5)` plafonné à 100
- 60j = 90, 45j = 67, 30j = 45

**3. Score Republication (poids 25%)**
- Mesure la difficulté à pourvoir le poste
- Formule : `min(100, maxRepublicationCount * 25)`
- 4 republications = 100, 3 = 75, 2 = 50, 1 = 25

**4. Score Croissance Sales (poids 20%)**
- Mesure la croissance de l'effectif Sales sur 6 mois
- V1 : si data LinkedIn dispo → calcul direct. Sinon fallback sur funding récent + jobs ouverts comme proxy
- Formule : `min(100, growthPercent * 2.5)`
- +40% = 100, +20% = 50, +10% = 25

### Formule globale

```
score = 0.25 * scoreVolume
      + 0.30 * scorePersistance
      + 0.25 * scoreRepublication
      + 0.20 * scoreCroissanceSales
```

### Génération des drapeaux

À partir des scores, on génère 2-3 drapeaux explicatifs en pills pour la liste de résultats :

- Si `scoreVolume >= 70` → "X postes Sales ouverts"
- Si `scoreRepublication >= 50` → "Annonce republiée Xx"
- Si `lastFundingDate < 12 months` → "Levée Série X il y a X mois"
- Si `scoreCroissanceSales >= 70` → "+X% effectif Sales sur 6 mois"
- Si `seniorRolesActive > 0` → "Recrute Head of / VP / Senior"

Stockés dans `company_scores.flags` en JSONB.

---

## 7. AI prompts (Anthropic SDK)

### Modèle utilisé
`claude-opus-4-7` pour génération qualitative (recommandation Signals, angles décideurs).
`claude-sonnet-4-6` pour tâches plus volumineuses si besoin de coût/vitesse (V2).

### Prompt 1 : Recommandation Signals

Exécuté quand une company est scorée pour la première fois ou que ses signaux changent significativement. Stocké dans `company_recommendations`.

```
Tu es un expert du recrutement tech sales en France. Tu analyses une boîte qui recrute pour un consultant en cabinet de recrutement spécialisé.

Voici les données de la boîte :
- Nom : {company.name}
- Secteur : {company.sectorPrecise}
- Effectif : {company.employeeCount}
- Stade : {company.fundingStage}, dernière levée : {company.lastFundingAmount}M€ ({company.lastFundingDate})
- Score d'urgence : {score.score}/100

Postes Sales actifs ({jobs.length}) :
{jobs.map(j => `- ${j.title} (${j.level}), publié ${j.publishedAt}, republié ${j.republicationCount}x`).join('\n')}

Décideurs identifiés :
{decisionMakers.map(d => `- ${d.fullName} — ${d.titleExact}${d.isRecent ? ' (arrivé récemment)' : ''}`).join('\n')}

Génère une recommandation stratégique en 4 lignes maximum (≈ 50 mots) qui explique :
1. Pourquoi cette boîte est une opportunité maintenant (signaux convergents)
2. L'angle exclusif que le consultant peut proposer (positionnement vs autres cabs)

Ton : analyste senior à confrère, factuel, pas de jargon marketing, pas de superlatifs creux. Termine par une phrase d'action concrète.
```

### Prompt 2 : Angle d'approche par décideur

Exécuté pour chaque décideur d'une fiche débloquée (lazy : seulement si pas déjà généré). Stocké dans `decision_makers.angleApproach`.

```
Tu génères un angle d'approche pour un consultant cabinet qui veut contacter ce décideur.

Boîte : {company.name} — {company.sectorPrecise}
Score d'urgence : {score.score}/100
Contexte : {company recommendation existing}

Décideur :
- Nom : {dm.fullName}
- Titre : {dm.titleExact}
- Ancienneté : {dm.startedAt} ({dm.isRecent ? 'récente' : 'établie'})
- LinkedIn : {dm.linkedInUrl}

Postes Sales ouverts les plus pertinents pour ce décideur :
{jobsRelevantToRole}

Génère un angle d'approche en 2-3 phrases (≈ 40 mots) qui :
1. Identifie un signal personnel ou un contexte spécifique à ce décideur
2. Propose un hook concret (ce que le consultant peut dire en première interaction)

Ton : conseil senior, factuel, observation > argument. Pas de "Bonjour [Prénom]", pas de phrase de vente. Le consultant lira ça et saura quoi faire.
```

### Prompt 3 : Calcul du potentiel mandat

Pas besoin d'AI pour celui-ci, c'est de l'arithmétique.

```typescript
function computeMandateEstimate(jobs: Job[]): MandateEstimate {
  const FEES_BY_LEVEL = { junior: 0.18, mid: 0.20, senior: 0.23, head: 0.25, vp: 0.27 };
  const SALARY_BY_LEVEL_AND_FUNCTION = {
    'account_executive': { junior: 50, mid: 75, senior: 110, head: 140, vp: 170 },
    'sales_manager': { mid: 90, senior: 120, head: 150 },
    'sdr': { junior: 38, mid: 50 },
    // etc.
  };

  const breakdown = jobs.map(job => {
    const salary = SALARY_BY_LEVEL_AND_FUNCTION[job.function]?.[job.level] || 80;
    const fee = FEES_BY_LEVEL[job.level] || 0.20;
    return { job, salary, fee, mandate: Math.round(salary * fee) };
  });

  const total = breakdown.reduce((sum, b) => sum + b.mandate, 0);
  return {
    estimateMin: Math.round(total * 0.85),  // marge basse
    estimateMax: Math.round(total * 1.15),
    breakdown
  };
}
```

---

## 8. Frontend — Design final validé

### 8.1 Source de vérité : le bundle design

Le design final a été produit dans Claude Design et exporté en bundle de référence. **Ce bundle est la source de vérité visuelle absolue** — toutes les décisions de design (couleurs exactes, layouts, typographie, micro-interactions) y sont définitives.

**Bundle livré dans `/design-reference/`** à la racine du repo, contenant :
- `Sparkway Signals.html` — point d'entrée HTML avec config Tailwind, fonts, et palette
- `ui.jsx` — primitives UI partagées (Icon, ScoreCircle, CircularScoreLarge, Pill, PrimaryButton, SecondaryButton, GhostButton, Card, CompanyMark, ScoreBar, Logo, CreditsBadge)
- `app.jsx` — shell de navigation (Header sticky, dispatcher d'écrans)
- `screen-onboarding.jsx` — 3 étapes (secteurs/fonctions/régions)
- `screen-search.jsx` — templates + filtres
- `screen-results.jsx` — freebie + teasers floutés
- `screen-company.jsx` — fiche débloquée v3 (la version la plus aboutie)
- `screen-billing.jsx` — modale de paiement Stripe
- `screen-profile.jsx` — profil + historique
- `data.jsx` — mock data complète, à remplacer par les vraies APIs

**Règle absolue** : avant d'implémenter un écran, ouvrir le `.jsx` correspondant et le lire intégralement. Reproduire le rendu visuel pixel-perfect en convertissant les patterns vers la stack de prod (Vite + React + Tailwind avec config dédiée). Ne pas copier la structure interne du prototype (single-file React + Babel CDN) — c'est un prototype, pas du code de prod.

### 8.2 Stack de prod recommandée pour le frontend

- **Vite + React 18 + TypeScript strict** (pas de Babel CDN)
- **Tailwind CSS** avec config qui réplique exactement la palette du prototype (cf. 8.3)
- **lucide-react** (vraie lib, pas le CDN UMD du prototype) pour les icônes
- **Fonts** : Fraunces (300/400/500/600 + opsz 9..144) + Inter (400/500/600), via Google Fonts en `<link>` dans index.html
- **react-router-dom** pour le routing (le prototype gère la nav par useState, pas adapté en prod)
- **Zustand** ou **TanStack Query** pour la gestion d'état serveur

### 8.3 Tailwind config (à reproduire exactement)

```typescript
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#1F3A2E', light: '#2D4F3F' },
        porcelain: { DEFAULT: '#F5F1EA', dark: '#EAE3D6' },
        ink: { DEFAULT: '#1A1A1A', soft: '#5A5A5A' },
        sage: '#7BA589',
        bordeaux: '#7A2E2E',
        sand: '#D4C4A8',
        warmgray: '#A8A29A',
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### 8.4 CSS global (variables + utilities sur-mesure)

À placer dans `src/index.css` après les imports Tailwind. **Ces classes utilitaires sont utilisées partout dans le bundle design** — elles doivent exister en prod.

```css
:root {
  --forest: #1F3A2E;
  --forest-light: #2D4F3F;
  --porcelain: #F5F1EA;
  --porcelain-dark: #EAE3D6;
  --ink: #1A1A1A;
  --ink-soft: #5A5A5A;
  --sage: #7BA589;
  --bordeaux: #7A2E2E;
  --sand: #D4C4A8;
  --warmgray: #A8A29A;
}

html, body {
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  background: var(--porcelain);
  color: var(--ink);
}

* { -webkit-font-smoothing: antialiased; }

.font-serif {
  font-family: 'Fraunces', ui-serif, Georgia, serif;
  font-optical-sizing: auto;
}

/* Utility classes critiques (référencées dans tous les écrans) */
.blur-name { filter: blur(5px); user-select: none; }
.hairline { border-color: rgba(26, 26, 26, 0.10); }
.hairline-strong { border-color: rgba(26, 26, 26, 0.18); }

/* Surfaces — distinction subtile par rapport au background porcelain */
.surface { background: #FCFAF6; }
.surface-raised {
  background: #FFFFFF;
  box-shadow: 0 1px 2px rgba(26, 26, 26, 0.04), 0 4px 16px -8px rgba(26, 26, 26, 0.08);
}
.surface-sage {
  background: rgba(123, 165, 137, 0.10);
  border-color: rgba(123, 165, 137, 0.30) !important;
}
.surface-sage-strong {
  background: rgba(123, 165, 137, 0.16);
  border-color: rgba(123, 165, 137, 0.40) !important;
}

/* Focus ring custom (forest tinted) */
.focus-forest:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(31, 58, 46, 0.25);
}

/* Texture papier subtile en background — laissée au layout root */
body::before {
  content: "";
  position: fixed; inset: 0; pointer-events: none;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(123, 165, 137, 0.06), transparent 60%),
    radial-gradient(900px 500px at 110% 110%, rgba(212, 196, 168, 0.10), transparent 60%);
  z-index: 0;
}

#root { position: relative; z-index: 1; }
```

### 8.5 Composants partagés à porter en TypeScript

Reproduire chacun de ces composants depuis `ui.jsx` du bundle, en les typant proprement. Liste des composants :

| Composant | Rôle | Notes d'implémentation |
|---|---|---|
| `Icon` | Wrapper lucide | Utiliser `lucide-react` directement, pas la lib UMD du prototype. Props : `name`, `size`, `strokeWidth`, `className` |
| `scoreTone(score)` | Helper qui mappe score → couleurs | 80+ forest, 60-79 sage, 40-59 sand, <40 warmgray. Retourne `{ bg, text, label, soft, textSoft }` |
| `ScoreCircle` | Pastille score (taille 56 par défaut) | Utilisé dans les listes |
| `CircularScoreLarge` | Score 160px avec arc SVG progressif | Utilisé dans le header de la fiche débloquée |
| `Pill` | Badge arrondi avec 5 tones (sand/sage/bordeaux/forest/ink) | Optionnel : icône lucide à gauche |
| `PrimaryButton` | Bouton forest, 2 tailles (md/lg), icon optionnel left/right | Le seul bouton qui utilise forest comme background |
| `SecondaryButton` | Bouton outline ink/20 | Pour actions secondaires |
| `GhostButton` | Lien-bouton sans bordure | Pour actions tertiaires (retour, voir plus...) |
| `Card` | Container porcelain ou porcelain-dark avec hairline border | Pour grouper visuellement |
| `CompanyMark` | Monogramme initial sand sur fond carré | Variante `blurred` pour les teasers |
| `ScoreBar` | Barre horizontale 3px avec label + valeur + note | Utilisé dans le bloc "Pourquoi ce score" |
| `Logo` | "Sparkway Signals" avec petit chevron forest | Header partout |
| `CreditsBadge` | Compteur credits + lien recharger | Header partout |

### 8.6 Routes (architecture prod)

Le prototype navigue par useState, en prod on utilise react-router :

- `/` — landing publique si non auth, sinon redirect `/recherche`
- `/auth/login` — page magic link (input email + envoi)
- `/auth/verify?token=XXX` — vérification + redirect onboarding ou recherche
- `/onboarding` — 3 étapes (cf `screen-onboarding.jsx`), redirect `/recherche` au done
- `/recherche` — page de templates + filtres (cf `screen-search.jsx`)
- `/recherches/:searchId` — résultats (cf `screen-results.jsx`)
- `/boites/:companyId` — fiche entreprise (cf `screen-company.jsx`)
- `/profil` — profil + credits + historique (cf `screen-profile.jsx`)
- Modale Billing — overlay global, géré par état Zustand (cf `screen-billing.jsx`)

### 8.7 Architecture des écrans (résumé fonctionnel)

**Onboarding (`screen-onboarding.jsx`)**
3 étapes successives, indicateur de progression en haut. Validation par étape : sectors max 3, functions max 5, regions min 1. Bouton "Suivant" disabled tant que la validation n'est pas OK. Au done, POST `/api/onboarding` puis redirect `/recherche`.

**Recherche (`screen-search.jsx`)**
- Headline serif large : "Trouve les boîtes qui ont besoin de toi *avant qu'elles ne le sachent.*" (le "avant qu'elles ne le sachent" en italique forest)
- Section templates : 4 cards empilées, avec icône arrow-right qui translate au hover
- Section filtres : collapse, items pré-remplis depuis le périmètre, chips toggleables
- Bouton "Lancer la recherche" centré en bas, primary forest grande taille

**Résultats (`screen-results.jsx`)**
- Bandeau "Signals a trouvé X boîtes qui auraient besoin de toi"
- Première carte = freebie en grand, sage-tinted, complète (logo + nom + score + drapeaux + recommandation courte + CTA "Voir la fiche")
- Suite = teasers en grid 2 colonnes : logo CompanyMark `blurred`, nom flouté avec class `blur-name` ou texte rédigé `S██████`, score visible, 1 drapeau partiel, bouton "Débloquer · 1 credit"
- Sticky CTA en bas ou sidebar : "Tu as X credits — tu peux débloquer X boîtes"

**Fiche entreprise (`screen-company.jsx`)** — la plus aboutie, c'est la v3 finale
Layout 2 colonnes (1fr + 320px), porcelain background. Hierarchie visuelle stricte :

1. **Header sans card** : monogramme 64px + pill "Fiche débloquée" sage avec icône check + nom serif 52px + meta (secteur · taille · ville · website forest underline) + score circulaire CircularScoreLarge 160px à droite
2. **PRIMARY 1 — Pourquoi maintenant** : bloc `surface-sage-strong`, padding 8, label small caps "POURQUOI MAINTENANT — RECOMMANDATION SIGNALS" en sage foncé, texte recommandation en serif italique 24px. **Le bloc qui doit attirer l'œil en premier.**
3. **PRIMARY 2 — Potentiel mandat** : bloc `surface-sage`, label small caps "POTENTIEL MANDAT ESTIMÉ", chiffre serif 44px tabular-nums (ex: "92 000 € — 156 000 €"), résumé court, lien "Voir le calcul" qui révèle la breakdown détaillée
4. **SECONDARY — Décideurs identifiés** : SectionHeader avec titre + subtitle, puis 4 cards `surface-raised`, chacune avec : monogramme 56px + nom serif + role + pill (sage si récent, sand sinon) + lien LinkedIn + séparateur + bloc "ANGLE D'APPROCHE" en italique serif 15px
5. **TERTIARY — Pourquoi ce score** : SectionHeader eyebrow only, grid 2 colonnes de 4 ScoreBar
6. **TERTIARY — Timeline** : SectionHeader avec subtitle, liste verticale d'événements avec ligne hairline reliant les puces. Date en italique sage à gauche (140px), description en ink à droite. Dernier événement (now) en forest filled
7. **TERTIARY — Postes ouverts** : table-like sans card, divisée par hairlines, chaque ligne avec icône function (sand) + titre + date + pill "Republié" si applicable + lien external

**Sidebar (sticky top-24)**
- `surface-raised` : "Signaux entreprise" — dl avec dt small caps + dd, sépareurs hairline. Inclut effectif, croissance Sales, dernière levée, lead investor, stade, CEO + lien LinkedIn
- Card "Concurrence cabinet" en disabled (background ink/2%, pill "Bientôt") avec chiffre flouté — installe la promesse V2 sans la livrer
- `surface-raised` : "Actions" — bouton primary forest "Marquer comme contacté" (toggle), bouton secondary "Sauvegarder", bouton disabled "Exporter en PDF" avec pill "Bientôt"
- Mention finale "Données vérifiées il y a 4h · Sources : France Travail, Adzuna, LinkedIn public, Pappers"

**Billing modale (`screen-billing.jsx`)**
Overlay sur ink/30 + blur, modale porcelain, 3 packs en cards (Découverte 30/29€, Pro 100/79€, Cabinet 500/299€), CTA "Payer avec Stripe" forest, mention "Paiement sécurisé · CB ou prélèvement".

**Profil (`screen-profile.jsx`)**
4 sections : Mon périmètre (avec bouton modifier), Mes credits (solde + historique), Mes fiches débloquées (liste 5 dernières), Compte (email + déconnexion bordeaux discret).

### 8.8 Comportements de navigation à reproduire

- **Header sticky** avec backdrop blur (`bg-porcelain/90 backdrop-blur`)
- Onglet actif souligné par une ligne forest 1px sous le label (pas de pill background)
- Le clic sur le logo retourne à `/recherche`
- L'écran d'onboarding **cache le header** (`hidden` prop dans le prototype)
- La modale Billing est globale, accessible depuis `Recharger` partout

### 8.9 Mock data : référence et migration

Le fichier `data.jsx` du bundle contient des données mockées **complètes et crédibles** (Pennylane, Spendesk, Aircall, Qonto, Alma, Lydia, Swile, Joko, etc.) avec décideurs nommés, angles AI rédigés, timelines détaillées, breakdowns de mandate.

**Stratégie de migration** :
1. **Phase de dev** : utiliser ce mock tel quel comme fixtures dans le frontend, en branchant les screens sur ces objets statiques
2. **Phase d'intégration API** : remplacer progressivement les imports `mockData.X` par des hooks React Query qui fetchent les vrais endpoints
3. **Phase de seed prod** : utiliser les données du mock comme **first seed de la base companies** (avant de lancer Adzuna/FT pour avoir 10 fiches béton dès le jour 1 — cf section 11 milestone semaine 5)

Les angles AI mockés dans `data.jsx` sont d'excellents exemples de ce que doivent produire les prompts Claude (cf section 7) — utiliser comme référence de calibrage.

---

## 9. Stripe integration

### Setup initial (manuel via dashboard Stripe)
Créer 3 produits avec leur Price respectif :
- "Pack Découverte" — 30 credits — 29€ TTC
- "Pack Pro" — 100 credits — 79€ TTC
- "Pack Cabinet" — 500 credits — 299€ TTC

Récupérer les Price IDs et les mettre dans les env vars.

### Webhook
Endpoint `/api/stripe/webhook` configuré dans le dashboard Stripe.
Events à écouter :
- `checkout.session.completed` (principal)
- `payment_intent.payment_failed` (logging)

Vérifier la signature Stripe avec `STRIPE_WEBHOOK_SECRET`.

### Gestion erreur
Si le webhook échoue (DB down, etc.) :
- Stripe retry automatique pendant 3 jours
- En cas de double-traitement, l'idempotency check sur `stripeSessionId` empêche le double crédit

### Mode test V1
Démarre avec les Stripe test keys. Bascule en live keys uniquement quand toute la chaîne est validée.

---

## 10. Déploiement

### Vercel
- Connecter le repo `sparkway-signals` à Vercel
- Domaine principal : `signals.sparkway.work`
- Configurer DNS chez GoDaddy : CNAME `signals` → `cname.vercel-dns.com`
- Variables d'env : toutes celles listées en section 2

### Neon
- Créer un projet "sparkway-signals"
- Récupérer la connection string pooled (pour Vercel serverless)
- Configurer 2 branches : `main` (prod) et `dev` (preview)

### Vercel Cron
Configurer dans `vercel.json` :
```json
{
  "crons": [
    { "path": "/api/cron/ingest-jobs", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/recompute-scores", "schedule": "30 */6 * * *" },
    { "path": "/api/cron/detect-closed-jobs", "schedule": "0 4 * * *" }
  ]
}
```

Sécuriser les endpoints cron avec `CRON_SECRET` en header.

### Migrations DB
- Drizzle Kit pour générer les migrations
- Run automatique en pre-deploy via `vercel.json` ou script `postbuild`

---

## 11. Roadmap V1 — découpée en milestones

### Semaine 1 — Foundation
- [ ] Init repo `sparkway-signals` (Vite + React + Express + TS strict)
- [ ] Setup Drizzle + Neon, schéma initial (users, magic_link_tokens, credit_transactions)
- [ ] Setup Tailwind + design system (variables CSS forest/porcelain, fonts)
- [ ] Auth magic link end-to-end (envoi Resend, verify, session cookie)
- [ ] Pages : login, verify, onboarding (3 steps fonctionnels)
- [ ] Deploy initial sur Vercel + DNS sous-domaine

### Semaine 2 — Données & scoring
- [ ] Schéma DB complet (companies, jobs, decision_makers, scores, recommendations, etc.)
- [ ] Intégration Adzuna API (auth, fetch, mapping vers schema)
- [ ] Intégration France Travail API (OAuth2, fetch, mapping)
- [ ] Cron d'ingestion jobs + détection republication
- [ ] Pipeline de scoring (4 sous-scores + global)
- [ ] Génération automatique des drapeaux

### Semaine 3 — Recherche & fiche
- [ ] Endpoint `/api/templates` avec compteurs dynamiques
- [ ] Endpoint `/api/search` avec sélection freebie
- [ ] Page recherche (templates + filtres)
- [ ] Page résultats (freebie + teasers floutés)
- [ ] Endpoint `/api/companies/:id/unlock` + transaction credits
- [ ] Page fiche entreprise débloquée (layout v2 complet)
- [ ] Génération AI : recommandation Signals + angles décideurs
- [ ] Calcul potentiel mandat
- [ ] Timeline events agrégation

### Semaine 4 — Paiement & polish
- [ ] Setup Stripe (produits, prices, webhook)
- [ ] Endpoint checkout + page profil
- [ ] Webhook Stripe + idempotency
- [ ] Page profil complète (credits, historique, fiches débloquées)
- [ ] Tests end-to-end : signup → onboarding → recherche → unlock → paiement → unlock
- [ ] Polish UX : loading states, errors, empty states basiques
- [ ] Préparation page d'accueil publique signals.sparkway.work (landing)

### Semaine 5 (buffer) — Launch beta
- [ ] Soft launch à 5-10 cabs (Sébastien + contacts)
- [ ] Monitoring : Sentry pour erreurs, Vercel Analytics pour usage
- [ ] Itération rapide sur feedback réel

---

## 12. Métriques de succès — KPIs à tracker dès le lancement

### Acquisition
- Visiteurs uniques landing
- Taux de conversion landing → signup (cible : 8-12%)
- Taux de complétion onboarding (cible : >85%)

### Activation
- % users qui font au moins 1 recherche dans les 24h après signup
- % users qui débloquent au moins 1 fiche payante dans les 7 jours
- Temps moyen entre signup et 1ère recherche

### Revenue
- ARPU first-purchase (cible : 29€ moyenne, beaucoup vont en 79€)
- % users qui rechargent au moins 1 fois (cible : 40-50% dans 30j)
- Lifetime value à 90j (cible : 60-100€)

### Engagement
- Recherches par user par semaine (cible : 2-4)
- Fiches débloquées par user par semaine (cible : 3-8)
- % freebies qui amènent au déblocage payant dans la même session (cible : 25-40%)

### Qualité produit
- % de fiches "marked as contacted" (proxy d'utilité réelle)
- NPS post-3-recharge (envoi automatique après 3ème pack acheté)
- Taux de refund / dispute (cible : <2%)

### Tracking technique
- Mixpanel ou PostHog pour les events produit
- Stripe dashboard pour les revenus
- Logs custom dans une table `analytics_events` pour les events critiques (search_performed, unlock_attempted, unlock_succeeded, payment_succeeded)

---

## 13. Décisions explicitement OUT de scope V1

Pour éviter le scope creep :
- ❌ SSO / OAuth (magic link suffit)
- ❌ Alertes email hebdo (V2)
- ❌ Recherches sauvegardées (V2)
- ❌ Multi-user / équipes (1 user = 1 compte en V1)
- ❌ Export CSV / PDF (V2)
- ❌ Pappers / Crunchbase enrichissement automatique (manuel V1, automatisé V2)
- ❌ Détection "boîte qui passe par cab" et nommage des cabs concurrents (trop sensible juridiquement)
- ❌ Onboarding tour fancy / empty states travaillés (V2)
- ❌ Coordonnées directes (email pro / téléphone) — V2 via partenariat compliant
- ❌ Activité LinkedIn récente des décideurs (V2)
- ❌ Benchmark cabinet (V3, nécessite réseau Sparkway critique)

---

## 14. Risques connus et mitigations

**Risque 1 : Adzuna rate limits**
Solution : cache agressif côté DB (toutes les 6h max), pas de fetch en live à chaque recherche utilisateur. Backup : France Travail couvre 70%+ du marché français à elle seule.

**Risque 2 : Données fraîches mais pas temps réel**
Solution : afficher visiblement la date de dernière vérification ("Données vérifiées il y a 4h"). Refetch live au moment du déblocage de fiche pour les jobs (au moins vérifier si encore actifs).

**Risque 3 : Cold start (peu de boîtes en base au lancement)**
Solution : pre-seeding avant beta — 2-3 jours d'ingestion intensive pour avoir 500+ boîtes scorées dès le jour 1. Accepter que la première semaine de beta ait moins de profondeur.

**Risque 4 : Détection de décideurs pour V1**
Mitigation : V1 minimal viable = CEO depuis Pappers (mandataires sociaux, données publiques officielles). Les autres décideurs (VP Sales, Head TA) en V1.5 via scraping LinkedIn ou enrichissement Apollo. Si V1 démarre sans 4 décideurs systématiques, accepter et présenter "1-2 décideurs identifiés" plutôt que viser 4 partout.

**Risque 5 : Pricing à valider**
29€ pour 30 credits = 0,97€/fiche. Si beta révèle que c'est trop bas (pas assez de revenu) ou trop haut (peu de conversion), ajuster post-beta. Garder 29€ comme prix d'entrée beta-only, vise 39-49€ post-beta pour le pack découverte.

---

## 15. Conventions de code

- TypeScript strict, **interdiction de `as any`**
- Pas de `console.log` en prod (utiliser un logger structuré)
- Tous les endpoints validés avec Zod (schemas inputs ET outputs)
- Drizzle queries dans une couche `repositories/`, jamais directement dans les routes
- Tests : Vitest pour unit (scoring, mandate estimate), Playwright pour e2e critique (signup → unlock → payment)
- Préfix les commits : `feat:`, `fix:`, `chore:`, `refactor:`
- Branches : `main` (prod), feature branches `feat/...`, PRs avec review

---

## 16. Premier prompt à donner à Claude Code

Une fois ce doc dans le repo **et le bundle design copié dans `/design-reference/`**, le premier prompt à coller dans Claude Code (terminal local Mac) :

> Lis `SIGNALS_SPARKWAY.md` à la racine, puis lis `/design-reference/Sparkway Signals.html` et `/design-reference/ui.jsx` en entier (c'est le design final validé, source de vérité visuelle).
>
> Initialise le projet `sparkway-signals` selon la section 11 milestone "Semaine 1 — Foundation" et la section 8 "Frontend — Design final validé". Stack : Vite + React 18 + TypeScript strict + Tailwind + Express + Drizzle + Neon.
>
> Ordre de travail :
> 1. Init du repo (Vite + Express en monorepo simple ou apps séparées — propose-moi le choix avant de commencer)
> 2. Setup Tailwind avec la config exacte de la section 8.3 et les utilitaires CSS de la section 8.4
> 3. Import des fonts Fraunces + Inter
> 4. Port en TypeScript des composants partagés depuis `/design-reference/ui.jsx` (cf section 8.5)
> 5. Setup Drizzle + Neon avec le schéma initial (users, magic_link_tokens, credit_transactions)
> 6. Auth magic link end-to-end avec Resend
> 7. Page onboarding (porter `/design-reference/screen-onboarding.jsx` en TS)
> 8. Deploy Vercel + DNS sous-domaine signals.sparkway.work
>
> Avant de commencer, propose-moi ton plan détaillé en 5-7 bullets et attends ma validation. Pour chaque écran porté, ouvre d'abord le `.jsx` correspondant et lis-le intégralement avant d'écrire du code — le rendu final doit être pixel-perfect.

---

Fin du document.
