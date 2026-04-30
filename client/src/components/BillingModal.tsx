import { useEffect, useState } from "react";
import { Icon, Pill, PrimaryButton } from "@/components/ui";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useBilling } from "@/lib/billing-context";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceEur: number;
  perCreditEur: number;
  tag: string;
  tagTone: "sand" | "sage";
  desc: string;
}

export function BillingModal() {
  const { open, hide } = useBilling();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [selected, setSelected] = useState<string>("pro");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    apiGet<{ packs: CreditPack[] }>("/api/credits/packs")
      .then((r) => {
        setPacks(r.packs);
        if (r.packs.length > 0 && !r.packs.some((p) => p.id === selected)) {
          setSelected(r.packs[0]?.id ?? "");
        }
      })
      .catch((err) => console.error("[billing] packs failed", err));
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  if (!open) return null;

  const pack = packs.find((p) => p.id === selected);

  const checkout = async () => {
    if (!pack) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await apiPost<{ checkoutUrl: string }>("/api/credits/checkout", {
        pack: pack.id,
      });
      window.location.href = r.checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError("Stripe n'est pas encore configuré pour ce pack. Contacte le support.");
      } else {
        console.error("[checkout] failed", err);
        setError("Impossible de lancer le paiement. Réessaie.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        onClick={hide}
        style={{ background: "rgba(26,26,26,0.30)", backdropFilter: "blur(6px)" }}
      />
      <div
        className="relative w-full max-w-2xl bg-porcelain rounded-lg overflow-hidden border hairline-strong"
        style={{ boxShadow: "0 30px 80px -20px rgba(26,26,26,0.25)" }}
      >
        <div className="px-8 pt-8 pb-6 flex items-start justify-between">
          <div>
            <h2 className="font-serif font-light text-3xl tracking-tight text-ink leading-tight">
              Recharge tes credits
            </h2>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              Tes credits sont valables 12 mois. Pas d'engagement.
            </p>
          </div>
          <button
            onClick={hide}
            className="text-ink-soft hover:text-ink p-1.5 rounded-md hover:bg-porcelain-dark transition"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="px-8 pb-8">
          <div className="space-y-3">
            {packs.map((p) => {
              const isSel = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left rounded-lg p-5 transition border-2 ${
                    isSel
                      ? "border-forest bg-porcelain-dark"
                      : "border-[rgba(26,26,26,0.10)] bg-porcelain-dark/50 hover:border-[rgba(26,26,26,0.25)]"
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSel ? "border-forest bg-forest" : "border-[rgba(26,26,26,0.25)]"
                      }`}
                    >
                      {isSel && (
                        <Icon
                          name="check"
                          size={12}
                          className="text-porcelain"
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-xl font-light text-ink tracking-tight">
                          {p.name}
                        </span>
                        {p.tag && <Pill tone={p.tagTone}>{p.tag}</Pill>}
                      </div>
                      <p className="mt-1 text-xs text-ink-soft leading-relaxed">{p.desc}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-serif text-2xl font-light text-ink tabular-nums">
                        {p.priceEur} €
                      </div>
                      <div className="text-[11px] text-ink-soft tabular-nums">
                        {p.credits} credits ·{" "}
                        {p.perCreditEur.toFixed(2).replace(".", ",")} €/credit
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-bordeaux" role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="text-xs text-ink-soft leading-relaxed">
              Paiement sécurisé · CB ou prélèvement
            </div>
            <PrimaryButton icon="lock" onClick={checkout} disabled={submitting || !pack}>
              {submitting
                ? "Redirection…"
                : `Payer avec Stripe — ${pack?.priceEur ?? "—"} €`}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
