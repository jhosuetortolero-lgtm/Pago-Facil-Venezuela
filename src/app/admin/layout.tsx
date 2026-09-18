import { redirect } from "next/navigation";
import { MerchantShell } from "@/components/merchant-shell";
import { createClient } from "@/lib/supabase/server";
import { signOutMerchant } from "./actions";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: store } = await supabase.from("stores").select("onboarding_status").eq("owner_id", user.id).maybeSingle();
  const storeIsActive = store?.onboarding_status === "active";
  return <MerchantShell email={user.email ?? "Comerciante"} storeIsActive={storeIsActive} signOut={signOutMerchant}>{children}</MerchantShell>;
}
