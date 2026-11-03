import Link from "next/link";

/** Telif hakkı sahibi (müşteri okulun logosu/adı değişse de sabit kalır) */
export const COPYRIGHT_HOLDER = "ATS - All Time Sports";

/** Tüm sayfaların altında: telif hakkı ve hukuki metin bağlantıları */
export function Footer() {
  return (
    <footer className="border-t bg-white px-4 py-4 text-center text-xs text-gray-500 print:hidden">
      <p>
        © {new Date().getFullYear()} {COPYRIGHT_HOLDER}. Tüm hakları saklıdır.
      </p>
      <p className="mt-1 space-x-3">
        <Link href="/kvkk" className="underline-offset-2 hover:underline">KVKK Aydınlatma Metni</Link>
        <span aria-hidden="true">·</span>
        <Link href="/cerez-politikasi" className="underline-offset-2 hover:underline">Çerez Politikası</Link>
      </p>
    </footer>
  );
}
