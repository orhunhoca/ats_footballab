import { Fragment, type ReactNode } from "react";

/** Çok küçük, güvenli Markdown gösterici: başlıklar, madde işaretleri, **kalın**, _italik_. HTML çalıştırmaz. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    parts.push(
      tok.startsWith("**") ? (
        <strong key={i++}>{tok.slice(2, -2)}</strong>
      ) : (
        <em key={i++}>{tok.slice(1, -1)}</em>
      )
    );
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-1 text-sm">
        {bullets.map((b, i) => (
          <li key={i}>{inline(b)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flushBullets(`ul-${idx}`);
    if (!line.trim()) return;
    if (line.startsWith("# ")) {
      blocks.push(<h3 key={idx} className="text-lg font-bold mt-1">{inline(line.slice(2))}</h3>);
    } else if (line.startsWith("## ")) {
      blocks.push(<h4 key={idx} className="text-base font-semibold mt-3">{inline(line.slice(3))}</h4>);
    } else if (line.startsWith("### ")) {
      blocks.push(<h5 key={idx} className="text-sm font-semibold mt-2">{inline(line.slice(4))}</h5>);
    } else {
      blocks.push(<p key={idx} className="text-sm leading-relaxed">{inline(line)}</p>);
    }
  });
  flushBullets("ul-end");

  return (
    <div className={className ?? "space-y-2"}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
