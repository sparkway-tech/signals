import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "@/pages/Login";
import { Onboarding } from "@/pages/Onboarding";
import { SearchPlaceholder } from "@/pages/SearchPlaceholder";

/**
 * App router.
 * Semaine 1 : login + onboarding + recherche placeholder.
 * Semaine 3+ : results, company, billing, profile (cf SIGNALS_SPARKWAY.md §8.6).
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/recherche" element={<SearchPlaceholder />} />
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
