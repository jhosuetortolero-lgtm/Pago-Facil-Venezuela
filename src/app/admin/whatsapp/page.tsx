import { getWahaSnapshot } from "./actions";
import { WhatsappConnection } from "@/components/whatsapp-connection";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  const snapshot = await getWahaSnapshot();
  return <WhatsappConnection initialSnapshot={snapshot} />;
}
