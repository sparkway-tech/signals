# Sparkway Signals

Outil SaaS de prospection B2B pour cabinets de recrutement spécialisés tech sales en France.

> **Source de vérité produit** : [`SIGNALS_SPARKWAY.md`](./SIGNALS_SPARKWAY.md) — toutes les décisions architecture, schéma DB, endpoints, scoring, prompts AI, roadmap.
>
> **Source de vérité visuelle** : [`design-reference/`](./design-reference/) — bundle Claude Design exporté. Contient le HTML d'entrée + 7 fichiers JSX (ui, app, screens) + data mock + chat transcript.

## Stack

- **Frontend** : Vite + React 18 + TypeScript strict + Tailwind v4
- **Backend** : Node.js + Express + TypeScript
- **Database** : Neon PostgreSQL + Drizzle ORM
- **Auth** : magic link (Resend)
- **Paiement** : Stripe Checkout one-shot
- **AI** : Anthropic SDK (Claude Sonnet 4.7)
- **Hosting** : Vercel
- **Domaine** : `signals.sparkway.work`

## Layout

```
sparkway-signals/
├── client/                 ← Vite + React 18 + Tailwind v4
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css       ← tokens CSS + utilities sur-mesure (§8.4)
│       └── components/
│           └── ui/         ← primitives portées depuis design-reference/ui.jsx
├── server/                 ← Express + TS
│   ├── index.ts
│   └── vercel-handler.ts
├── shared/                 ← (à venir) schéma Drizzle + types Zod partagés
├── design-reference/       ← bundle Claude Design (source de vérité visuelle)
├── SIGNALS_SPARKWAY.md     ← spec produit complète
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

## Commandes

```bash
npm install                 # install
npm run dev                 # API + web en parallèle (concurrently)
npm run build               # build prod (client + server)
npm run typecheck           # tsc --noEmit
npm run db:generate         # drizzle-kit generate (semaine 2)
npm run db:push             # drizzle-kit push (semaine 2)
```

## Variables d'environnement

Voir [`.env.example`](./.env.example).

Pour la prod, `DATABASE_URL` et `RESEND_API_KEY` sont auto-provisionnés
via les intégrations Vercel Marketplace (Neon Postgres + Resend).

## Roadmap V1

Voir SIGNALS_SPARKWAY.md §11 pour le détail. Synthèse :

- **Semaine 1** : foundation (init, Tailwind, fonts, UI primitives, Drizzle, auth, onboarding, deploy)
- **Semaine 2** : data & scoring (Adzuna, France Travail, cron, sub-scores)
- **Semaine 3** : recherche & fiche entreprise débloquée
- **Semaine 4** : Stripe checkout + webhook + profil + polish
- **Semaine 5** : launch beta (5-10 cabs, Sentry, Vercel Analytics)

## Conventions

- TypeScript **strict**, **interdiction de `as any`**
- Pas de `console.log` en prod (logger structuré)
- Tous les endpoints validés avec **Zod** (input ET output)
- Drizzle queries dans `server/repositories/`, jamais directement dans les routes
- Commits préfixés : `feat:`, `fix:`, `chore:`, `refactor:`
