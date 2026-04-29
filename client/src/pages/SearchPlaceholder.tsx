import { Logo, CreditsBadge } from "@/components/ui";
import { useNavigate } from "react-router-dom";

/**
 * Placeholder pour /recherche en attendant le port complet de
 * design-reference/screen-search.jsx (semaine 3 selon roadmap).
 */
export function SearchPlaceholder() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-porcelain/90 border-b hairline">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/recherche")} className="cursor-pointer">
            <Logo />
          </button>
          <CreditsBadge credits={0} onRecharge={() => {}} />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="font-serif font-light text-5xl text-ink leading-tight">
          Trouve les boîtes qui ont besoin de toi{" "}
          <span className="italic text-forest">avant qu'elles ne le sachent.</span>
        </h1>
        <p className="mt-6 text-ink-soft">
          La recherche arrive en semaine 3 (templates + filtres + freebie + teasers floutés).
        </p>
      </main>
    </div>
  );
}
