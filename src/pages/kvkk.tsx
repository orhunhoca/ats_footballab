import { LegalPage } from "@/components/legal/LegalPage";
import { buildKvkkDoc } from "@/lib/legal";

export default function KvkkPage() {
  return <LegalPage build={buildKvkkDoc} />;
}
