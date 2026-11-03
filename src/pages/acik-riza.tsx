import { LegalPage } from "@/components/legal/LegalPage";
import { buildConsentDoc } from "@/lib/legal";

export default function ConsentPage() {
  return <LegalPage build={buildConsentDoc} printable />;
}
