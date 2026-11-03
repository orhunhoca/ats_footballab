/**
 * Anthropic yanıtından rapor alanlarını çıkarır.
 *  1) Tercih: zorunlu araç çağrısı (rapor_yaz) -> geçerli JSON garantisi
 *  2) Yedek: metin içindeki JSON (```json çitleri ve açıklama metni tolere edilir)
 *  3) Son yedek: model araç çağırmadan düz Markdown rapor yazdıysa metnin kendisi rapor sayılır
 *     (veli özeti boş kalır; istemci kural tabanlı veli özetini kullanır). Yarım kalmış JSON ("{" ile
 *     başlayan metin) rapor sayılmaz.
 * Hiçbiri okunamazsa null döner.
 */
export interface Report {
  analysis: string;
  parentSummary: string;
}

type Block = { type: string; name?: string; text?: string; input?: Record<string, unknown> };

const clean = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);

export function extractReport(data: { content?: Block[] } | null | undefined): Report | null {
  const blocks: Block[] = Array.isArray(data?.content) ? (data!.content as Block[]) : [];

  const tool = blocks.find((b) => b.type === "tool_use" && b.name === "rapor_yaz")?.input;
  if (tool && typeof tool.analysis === "string" && tool.analysis.trim()) {
    return { analysis: tool.analysis.trim(), parentSummary: clean(tool.parent_summary, 280) };
  }

  const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (typeof parsed.analysis === "string" && parsed.analysis.trim()) {
        return { analysis: parsed.analysis.trim(), parentSummary: clean(parsed.parent_summary, 280) };
      }
    } catch {
      /* kesik/bozuk JSON */
    }
  }

  // Düz Markdown rapor: başlıklı ve yeterince uzun, JSON gibi başlamıyor
  const plain = text.replace(/^```(?:markdown|md)?\s*|```\s*$/gi, "").trim();
  if (plain.length >= 200 && /^#{1,3}\s/m.test(plain) && !plain.startsWith("{")) {
    return { analysis: plain, parentSummary: "" };
  }
  return null;
}
