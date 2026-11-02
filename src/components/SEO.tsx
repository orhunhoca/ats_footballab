import Head from 'next/head';

// Sosyal medya/WhatsApp önizlemeleri göreli adresleri okuyamaz; görsel adresi mutlak olmalı.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://alltimesports.vercel.app").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = "/og-image.jpg";

function absoluteUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

// SEO elements that can be used in _document.tsx (returns JSX without Head wrapper)
export function SEOElements({
  title = "FootbalLab Futbol Okulu",
  description = "Futbol okulu yönetim paneli",
  image = DEFAULT_OG_IMAGE,
  url,
}: SEOProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={absoluteUrl(image)} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content="FootbalLab" />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:url" content={url ? absoluteUrl(url) : SITE_URL} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={absoluteUrl(image)} />}
    </>
  );
}

// SEO component for use in pages/_app.tsx or individual pages (uses next/head)
// Note: Flattened structure (no fragment) for better Next.js Head compatibility during hot reload
export function SEO({
  title = "FootbalLab Futbol Okulu",
  description = "Futbol okulu yönetim paneli",
  image = DEFAULT_OG_IMAGE,
  url,
}: SEOProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={absoluteUrl(image)} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content="FootbalLab" />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:url" content={url ? absoluteUrl(url) : SITE_URL} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={absoluteUrl(image)} />}
    </Head>
  );
}
