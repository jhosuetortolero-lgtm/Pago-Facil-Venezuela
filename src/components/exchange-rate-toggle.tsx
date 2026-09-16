"use client";

import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export function ExchangeRateToggle({ automatic, manualRate }: { automatic: boolean; manualRate?: number | null }) {
  const [isAutomatic, setIsAutomatic] = useState(automatic);
  return <div><div className="flex items-center gap-3"><Switch checked={isAutomatic} onCheckedChange={setIsAutomatic} /><input type="hidden" name="exchange_rate_mode" value={isAutomatic ? "automatic" : "manual"} /><span className="text-sm">{isAutomatic ? "Automática (BCV)" : "Manual"}</span></div>{!isAutomatic ? <input name="manual_exchange_rate" type="number" step="0.0001" min="0.0001" defaultValue={manualRate ?? ""} placeholder="Tasa personalizada" className="mt-3 h-11 w-full rounded-lg border px-3" /> : null}</div>;
}
