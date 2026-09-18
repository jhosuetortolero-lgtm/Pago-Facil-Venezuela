"use client";

import { useState } from "react";
import { RenewalModal } from "@/components/renewal-modal";

type RenewalModalTriggerProps = { storeName: string; plan: string; amount: number | null; children: React.ReactNode; className?: string };

export function RenewalModalTrigger({ storeName, plan, amount, children, className }: RenewalModalTriggerProps) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={className}>{children}</button><RenewalModal open={open} onClose={() => setOpen(false)} storeName={storeName} plan={plan} amount={amount} /></>;
}
