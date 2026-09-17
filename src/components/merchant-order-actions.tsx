"use client";

import { Check, Loader2, X } from "lucide-react";
import { useFormStatus } from "react-dom";

type OrderAction = (formData: FormData) => void | Promise<void>;

function ActionButton({ kind, children }: { kind: "approve" | "reject"; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-60 ${kind === "approve" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-red-200 text-red-600 hover:bg-red-50"}`}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : kind === "approve" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{pending ? "Procesando..." : children}</button>;
}

export function MerchantOrderActions({ orderId, approve, reject }: { orderId: string; approve: OrderAction; reject: OrderAction }) {
  return <div className="flex flex-wrap gap-2"><form action={approve}><input type="hidden" name="order_id" value={orderId} /><ActionButton kind="approve">Aprobar pedido</ActionButton></form><form action={reject}><input type="hidden" name="order_id" value={orderId} /><ActionButton kind="reject">Rechazar</ActionButton></form></div>;
}
