import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "@/pages/Login";
import { Onboarding } from "@/pages/Onboarding";
import { Search } from "@/pages/Search";
import { Results } from "@/pages/Results";
import { CompanyDetail } from "@/pages/Company";
import { Profile } from "@/pages/Profile";
import { BillingModal } from "@/components/BillingModal";
import { SessionProvider } from "@/lib/session-context";
import { BillingProvider } from "@/lib/billing-context";

/**
 * App router.
 * SessionProvider fetch /api/me et expose user + creditsBalance globalement.
 * BillingProvider gère l'overlay du paywall (ouvert depuis n'importe quel écran).
 */
export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <BillingProvider>
          <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/recherche" element={<Search />} />
            <Route path="/recherches/:searchId" element={<Results />} />
            <Route path="/boites/:companyId" element={<CompanyDetail />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/" element={<Navigate to="/recherche" replace />} />
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
          <BillingModal />
        </BillingProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
