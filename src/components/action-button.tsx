"use client";

import { LogIn } from "lucide-react";

export function ActionButton({ children }: { children: React.ReactNode }) {
  return <button type="submit" className="pf-action-button"><span className="pf-action-label">{children}</span><span className="pf-action-icon" aria-hidden="true"><LogIn size={19} strokeWidth={2.2} /></span></button>;
}
