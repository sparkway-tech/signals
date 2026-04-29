import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Logo, PrimaryButton } from "@/components/ui";

/**
 * Login — magic link.
 * Email input, POST /api/auth/magic-link, message de confirmation.
 */
export function Login() {
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMessage =
    errorParam === "expired_token"
      ? "Ce lien a expiré ou a déjà été utilisé. Renvoie un nouveau lien."
      : errorParam === "invalid_token"
        ? "Lien invalide. Renvoie un nouveau lien."
        : errorParam === "user_not_found"
          ? "Compte introuvable. Réessaie."
          : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) {
        setError("Email invalide.");
        return;
      }
      setSent(true);
    } catch {
      setError("Connexion impossible. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-12">
          <Logo size={26} />
        </div>

        {sent ? (
          <div className="text-center">
            <h1 className="font-serif font-light text-[36px] leading-[1.1] tracking-tight text-ink mb-4">
              Vérifie ta boîte mail.
            </h1>
            <p className="text-sm text-ink-soft leading-relaxed">
              On a envoyé un lien de connexion à <span className="font-medium text-ink">{email}</span>.
              <br />
              Il est valide pendant 15 minutes.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="font-serif font-light text-[36px] leading-[1.1] tracking-tight text-ink">
                Connecte-toi à <span className="italic text-forest">Signals</span>
              </h1>
              <p className="mt-4 text-sm text-ink-soft leading-relaxed">
                Entre ton email pro. On t'envoie un lien magique — pas de mot de passe.
              </p>
            </div>

            {(errorMessage || error) && (
              <p className="text-center text-sm text-bordeaux mb-4" role="alert">
                {error ?? errorMessage}
              </p>
            )}

            <form onSubmit={submit} className="space-y-4">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="thomas@cabinet-altair.fr"
                className="w-full h-12 px-4 rounded-md border bg-transparent text-sm text-ink placeholder:text-ink-soft/60 focus-forest"
                style={{ borderColor: "rgba(26,26,26,0.20)" }}
              />
              <PrimaryButton type="submit" size="lg" iconRight="arrow-right" disabled={submitting} className="w-full">
                {submitting ? "Envoi en cours…" : "Recevoir mon lien"}
              </PrimaryButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
