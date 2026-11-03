import { hmacSha256Hex, HttpError } from "./security.ts";

/**
 * iyzico IYZWSv2 imzalı istek yardımcısı.
 *   randomKey  = zaman damgası + rastgele sayı
 *   signature  = HMAC-SHA256(secretKey, randomKey + uriPath + gövde) (hex)
 *   Authorization = "IYZWSv2 " + base64("apiKey:<apiKey>&randomKey:<randomKey>&signature:<signature>")
 *   x-iyzi-rnd = randomKey
 * uriPath, adresin /payment/... ile başlayan yoludur (alan adı ve sorgu hariç).
 */
export async function iyzicoHeaders(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  body: string,
): Promise<Record<string, string>> {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const signature = await hmacSha256Hex(secretKey, randomKey + uriPath + body);
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `IYZWSv2 ${btoa(authString)}`,
    "x-iyzi-rnd": randomKey,
  };
}

/** iyzico'ya imzalı POST gönderir; yanıt gövdesini JSON olarak döndürür. */
export async function iyzicoPost(
  creds: { apiKey: string; secretKey: string; baseUrl: string },
  uriPath: string,
  payload: unknown,
): Promise<Record<string, unknown>> {
  const body = JSON.stringify(payload);
  const baseUrl = creds.baseUrl.replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${uriPath}`, {
      method: "POST",
      headers: await iyzicoHeaders(creds.apiKey, creds.secretKey, uriPath, body),
      body,
    });
  } catch (error) {
    throw new HttpError(502, `iyzico'ya ulaşılamadı: ${error instanceof Error ? error.message : "bağlantı hatası"}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, `iyzico beklenmeyen yanıt verdi (HTTP ${response.status})`);
  }
}

export const IYZICO_PATHS = {
  initialize: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
  detail: "/payment/iyzipos/checkoutform/auth/ecom/detail",
  installment: "/payment/iyzipos/installment",
};

/** Edge Function'ların herkese açık adresi (iyzico müşteriyi buraya geri yönlendirir) */
export function functionUrl(name: string): string {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
}

/** Müşterinin dönüş yapacağı site adresi */
export function siteUrl(): string {
  return (Deno.env.get("SITE_URL") ?? "https://alltimesports.vercel.app").replace(/\/+$/, "");
}
