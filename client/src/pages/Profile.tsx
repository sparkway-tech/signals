import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  CompanyMark,
  GhostButton,
  Icon,
  Pill,
  PrimaryButton,
  ScoreCircle,
} from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import { useBilling } from "@/lib/billing-context";
import { useSession } from "@/lib/session-context";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

interface UnlockedItem {
  unlock: {
    id: string;
    companyId: string;
    unlockedVia: string;
    unlockedAt: string;
  };
  companyName: string;
  companyId: string;
  score: number | null;
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return (parts[0] ?? "??").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function relativeFr(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} ans`;
}

function formatTransactionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface SectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

function Section({ title, action, children }: SectionProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs uppercase tracking-[0.22em] text-ink-soft">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const { user, refresh } = useSession();
  const { show: showBilling } = useBilling();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unlocked, setUnlocked] = useState<UnlockedItem[]>([]);

  useEffect(() => {
    void refresh();
    apiGet<{ transactions: Transaction[] }>("/api/me/transactions")
      .then((r) => setTransactions(r.transactions))
      .catch((err) => console.error("[profile] transactions failed", err));
    apiGet<{ items: UnlockedItem[] }>("/api/me/unlocked")
      .then((r) => setUnlocked(r.items))
      .catch((err) => console.error("[profile] unlocked failed", err));
  }, [refresh]);

  const handleLogout = async () => {
    try {
      await apiPost("/api/auth/logout");
    } catch {
      // ignore
    }
    navigate("/auth/login");
  };

  if (!user) return null;

  const purchaseTransactions = transactions.filter((t) => t.type === "purchase" || t.amount > 0);

  return (
    <div className="min-h-screen bg-porcelain">
      <Header credits={user.creditsBalance} onRecharge={showBilling} />

      <main className="px-6 lg:px-12 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="font-serif font-light text-[40px] tracking-tight text-ink leading-tight">
              Profil &amp; paramètres
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Gère ton compte, ton périmètre et ton historique.
            </p>
          </div>

          <div className="space-y-12">
            <Section
              title="Mon périmètre"
              action={
                <GhostButton icon="pencil" onClick={() => navigate("/onboarding")}>
                  Modifier
                </GhostButton>
              }
            >
              <div className="bg-porcelain-dark border hairline rounded-lg p-7 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
                  <div className="text-xs uppercase tracking-wider text-ink-soft">Secteurs</div>
                  <div className="flex flex-wrap gap-2">
                    {user.sectors.length > 0 ? (
                      user.sectors.map((s) => (
                        <Pill key={s} tone="forest">
                          {s}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-sm text-ink-soft italic">Non renseigné</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 pt-5 border-t hairline">
                  <div className="text-xs uppercase tracking-wider text-ink-soft">Fonctions</div>
                  <div className="flex flex-wrap gap-2">
                    {user.functions.length > 0 ? (
                      user.functions.map((s) => (
                        <Pill key={s} tone="forest">
                          {s}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-sm text-ink-soft italic">Non renseigné</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 pt-5 border-t hairline">
                  <div className="text-xs uppercase tracking-wider text-ink-soft">Régions</div>
                  <div className="flex flex-wrap gap-2">
                    {user.regions.length > 0 ? (
                      user.regions.map((s) => (
                        <Pill key={s} tone="forest">
                          {s}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-sm text-ink-soft italic">Non renseigné</span>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Mes credits">
              <div className="bg-porcelain-dark border hairline rounded-lg p-7">
                <div className="flex items-end justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-xs text-ink-soft mb-2">Solde actuel</div>
                    <div className="font-serif font-light text-6xl text-ink tabular-nums leading-none">
                      {user.creditsBalance}
                    </div>
                    <div className="mt-2 text-sm text-ink-soft">credits disponibles</div>
                  </div>
                  <PrimaryButton icon="plus" onClick={showBilling}>
                    Recharger
                  </PrimaryButton>
                </div>

                {purchaseTransactions.length > 0 && (
                  <div className="mt-7 pt-6 border-t hairline">
                    <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-3">
                      Historique des achats
                    </div>
                    <ul className="divide-y" style={{ borderColor: "rgba(26,26,26,0.08)" }}>
                      {purchaseTransactions.slice(0, 6).map((p) => (
                        <li key={p.id} className="py-3 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-ink">
                              {p.description ?? "Recharge credits"}
                            </div>
                            <div className="text-xs text-ink-soft">
                              {formatTransactionDate(p.createdAt)}
                            </div>
                          </div>
                          <div className="text-sm text-sage tabular-nums">
                            +{p.amount}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            <Section
              title="Mes fiches débloquées"
              action={
                <span className="text-xs text-ink-soft">
                  {unlocked.length} fiche{unlocked.length > 1 ? "s" : ""}
                </span>
              }
            >
              <div className="bg-porcelain-dark border hairline rounded-lg overflow-hidden">
                {unlocked.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-ink-soft">
                    Tu n'as pas encore débloqué de fiche. Lance une recherche.
                  </div>
                ) : (
                  <ul className="divide-y" style={{ borderColor: "rgba(26,26,26,0.08)" }}>
                    {unlocked.map((h) => (
                      <li key={h.unlock.id} className="px-6 py-4 flex items-center gap-4">
                        <CompanyMark initials={initialsOf(h.companyName)} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-base font-light text-ink tracking-tight">
                            {h.companyName}
                          </div>
                          <div className="text-xs text-ink-soft">
                            Débloqué {relativeFr(h.unlock.unlockedAt).toLowerCase()}
                          </div>
                        </div>
                        {h.score !== null && <ScoreCircle score={h.score} size={36} />}
                        <button
                          onClick={() => navigate(`/boites/${h.companyId}`)}
                          className="inline-flex items-center gap-1 text-sm text-forest hover:text-forest-light transition"
                        >
                          Revoir <Icon name="arrow-right" size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>

            <Section title="Compte">
              <div className="bg-porcelain-dark border hairline rounded-lg p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-ink-soft mb-1">
                      Email
                    </div>
                    <div className="text-sm text-ink">{user.email}</div>
                  </div>
                </div>
                <div className="pt-5 border-t hairline flex items-center justify-end">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-bordeaux hover:underline underline-offset-4 transition"
                  >
                    <Icon name="log-out" size={14} /> Se déconnecter
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}
