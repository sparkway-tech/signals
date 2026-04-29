// App shell + navigation
function Header({ active, onNav, credits, onRecharge, hidden }) {
  if (hidden) return null;
  const items = [
    { id: "search", label: "Recherche" },
    { id: "fiches", label: "Mes fiches" },
    { id: "profile", label: "Profil" },
  ];
  const mappedActive = active === "results" || active === "company" ? "search" : active === "profile" ? "profile" : active;
  return (
    <header className="sticky top-0 z-30 bg-porcelain/90 backdrop-blur border-b hairline">
      <div className="px-6 lg:px-12 h-16 flex items-center justify-between gap-6">
        <button onClick={() => onNav("search")} className="shrink-0 focus:outline-none">
          <Logo size={24} />
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onNav(it.id === "fiches" ? "profile" : it.id)}
              className={`relative h-9 px-4 text-sm transition ${
                mappedActive === it.id ? "text-ink font-medium" : "text-ink-soft hover:text-ink"
              }`}
            >
              {it.label}
              {mappedActive === it.id && (
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

function App() {
  const [screen, setScreen] = useState("onboarding");
  const [perimeter, setPerimeter] = useState(mockData.user.perimeter);
  const [billingOpen, setBillingOpen] = useState(false);
  const [credits, setCredits] = useState(mockData.user.credits);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const onUnlock = () => {
    if (credits > 0) setCredits(c => c - 1);
    setScreen("company");
  };

  return (
    <div className="min-h-screen bg-porcelain">
      <Header
        hidden={screen === "onboarding"}
        active={screen}
        onNav={(id) => setScreen(id)}
        credits={credits}
        onRecharge={() => setBillingOpen(true)}
      />

      <main>
        {screen === "onboarding" && (
          <ScreenOnboarding onDone={(p) => { setPerimeter(p); setScreen("search"); }} />
        )}
        {screen === "search" && (
          <ScreenSearch
            perimeter={perimeter}
            onLaunch={(t) => { setActiveTemplate(t); setScreen("results"); }}
          />
        )}
        {screen === "results" && (
          <ScreenResults
            template={activeTemplate}
            credits={credits}
            onBack={() => setScreen("search")}
            onOpen={() => setScreen("company")}
            onUnlock={onUnlock}
            onRecharge={() => setBillingOpen(true)}
          />
        )}
        {screen === "company" && (
          <ScreenCompany onBack={() => setScreen("results")} />
        )}
        {screen === "profile" && (
          <ScreenProfile
            onLogout={() => { setScreen("onboarding"); }}
            onRecharge={() => setBillingOpen(true)}
            onView={() => setScreen("company")}
            onEditPerimeter={() => setScreen("onboarding")}
          />
        )}
      </main>

      <BillingModal open={billingOpen} onClose={() => setBillingOpen(false)} />

      {/* Dev nav helper */}
      {screen !== "onboarding" && (
        <div className="fixed bottom-4 right-4 z-40">
          <details className="group">
            <summary className="list-none cursor-pointer inline-flex items-center gap-2 px-3 h-9 rounded-md bg-porcelain-dark border hairline text-xs text-ink-soft hover:text-ink">
              <Icon name="layout-grid" size={13} /> Navigation maquettes
            </summary>
            <div className="mt-2 p-2 bg-porcelain border hairline rounded-md flex flex-col gap-1 min-w-[180px]" style={{ boxShadow: "0 10px 30px -10px rgba(26,26,26,0.20)" }}>
              {[
                ["onboarding", "0 · Onboarding"],
                ["search", "1 · Recherche"],
                ["results", "2 · Résultats"],
                ["company", "3 · Fiche débloquée"],
                ["profile", "5 · Profil"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setScreen(k)}
                  className={`text-left text-xs px-2 py-1.5 rounded ${screen === k ? "bg-forest text-porcelain" : "text-ink hover:bg-porcelain-dark"}`}
                >
                  {l}
                </button>
              ))}
              <button
                onClick={() => setBillingOpen(true)}
                className="text-left text-xs px-2 py-1.5 rounded text-ink hover:bg-porcelain-dark"
              >
                4 · Modale paiement
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
