import { useLocation, useNavigate } from "react-router-dom";
import { Logo, CreditsBadge } from "@/components/ui";

interface HeaderProps {
  credits: number;
  onRecharge: () => void;
}

const ITEMS: { id: "search" | "profile"; label: string; path: string }[] = [
  { id: "search", label: "Recherche", path: "/recherche" },
  { id: "profile", label: "Profil", path: "/profil" },
];

/**
 * Header sticky. Source : design-reference/app.jsx ligne 2-40.
 * Sub-nav avec underline forest sous l'item actif.
 * "Mes fiches" mappé vers Profil (cf design original).
 */
export function Header({ credits, onRecharge }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const active: "search" | "profile" =
    location.pathname.startsWith("/profil") ? "profile" : "search";

  return (
    <header className="sticky top-0 z-30 bg-porcelain/90 backdrop-blur border-b hairline">
      <div className="px-6 lg:px-12 h-16 flex items-center justify-between gap-6">
        <button onClick={() => navigate("/recherche")} className="shrink-0 focus:outline-none">
          <Logo size={24} />
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {ITEMS.map((it) => (
            <button
              key={it.id}
              onClick={() => navigate(it.path)}
              className={`relative h-9 px-4 text-sm transition ${
                active === it.id ? "text-ink font-medium" : "text-ink-soft hover:text-ink"
              }`}
            >
              {it.label}
              {active === it.id && (
                <span className="absolute left-3 right-3 -bottom-[17px] h-px bg-forest" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <CreditsBadge credits={credits} onRecharge={onRecharge} />
        </div>
      </div>
    </header>
  );
}
