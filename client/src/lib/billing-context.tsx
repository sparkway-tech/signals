import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface BillingState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const BillingContext = createContext<BillingState | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, show, hide }), [open, show, hide]);
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingState {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
