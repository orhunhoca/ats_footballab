import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Printer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { companyService, type PublicCompanyInfo } from "@/services/companyService";
import { hasMissingFields, LEGAL_DRAFT, LEGAL_LAST_UPDATED, type LegalDoc } from "@/lib/legal";

interface LegalPageProps {
  build: (company: PublicCompanyInfo) => LegalDoc;
  /** Yazdır düğmesi (örn. imzalatılacak açık rıza formu) */
  printable?: boolean;
}

/** Giriş gerektirmeyen hukuki metin sayfası. Şirket bilgileri ayarlardan otomatik gelir. */
export function LegalPage({ build, printable = false }: LegalPageProps) {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    companyService.getPublicInfo().then((info) => {
      if (!cancelled) setCompany(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const doc = build(company ?? {});

  return (
    <>
      <Head>
        <title>{`${doc.title} - FootbalLab`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white print:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" aria-label="Ana sayfa">
              <Brand size={36} />
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-emerald-700">
              <Link href="/kvkk" className="underline-offset-2 hover:underline">KVKK</Link>
              <Link href="/acik-riza" className="underline-offset-2 hover:underline">Açık Rıza</Link>
              <Link href="/cerez-politikasi" className="underline-offset-2 hover:underline">Çerez Politikası</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
          {LEGAL_DRAFT && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Bu metin <strong>taslaktır</strong>; yayına alınmadan önce hukuk danışmanı tarafından incelenmelidir.
                {company && hasMissingFields(doc) && " Köşeli parantezli alanlar, şirket bilgileri Ayarlar → Şirket ve Banka bölümüne girildiğinde otomatik dolacaktır."}
              </p>
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{doc.title}</h1>
              <p className="mt-1 text-sm text-gray-500">Son güncelleme: {LEGAL_LAST_UPDATED}</p>
            </div>
            {printable && (
              <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                <Printer className="mr-2 h-4 w-4" />
                Yazdır
              </Button>
            )}
          </div>

          {doc.intro && <p className="mb-6 leading-relaxed text-gray-800">{doc.intro}</p>}

          <div className="space-y-6">
            {doc.sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 text-lg font-semibold text-gray-900">{section.title}</h2>
                <div className="space-y-3 text-gray-800">
                  {section.blocks.map((block, i) =>
                    Array.isArray(block) ? (
                      <ul key={i} className="list-disc space-y-1 pl-5 leading-relaxed">
                        {block.map((item, j) => (
                          <li key={j} className="break-words">{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i} className="leading-relaxed break-words">{block}</p>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
