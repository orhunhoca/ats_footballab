import { LegalPage } from "@/components/legal/LegalPage";
import { buildCookieDoc } from "@/lib/legal";

export default function CookiePolicyPage() {
  return <LegalPage build={buildCookieDoc} />;
}
