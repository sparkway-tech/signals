import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, ApiError } from "@/lib/api";

export interface MeUser {
  id: string;
  email: string;
  onboardingCompleted: boolean;
  sectors: string[];
  functions: string[];
  regions: string[];
  creditsBalance: number;
}

interface SessionState {
  loading: boolean;
  user: MeUser | null;
  refresh: () => Promise<void>;
  setCredits: (n: number) => void;
}

const SessionContext = createContext<SessionState | null>(null);

/**
 * SessionProvider — fetch /api/me et expose user + creditsBalance.
 * setCredits permet aux écrans de mettre à jour le solde après un unlock,
 * sans devoir refetch (refresh() reste dispo si besoin).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiGet<MeUser>("/api/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        console.error("[session] refresh failed", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCredits = useCallback((n: number) => {
    setUser((u) => (u ? { ...u, creditsBalance: n } : u));
  }, []);

  const value = useMemo<SessionState>(
    () => ({ loading, user, refresh, setCredits }),
    [loading, user, refresh, setCredits],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
