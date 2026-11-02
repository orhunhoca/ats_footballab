import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse({ success: false, error: error.message }, error.status);
  }
  console.error(error);
  return jsonResponse(
    { success: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
    500,
  );
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * İsteği yapan kullanıcının JWT'sini doğrular ve rolünü kontrol eder.
 * Anon anahtar geçerli bir kullanıcı JWT'si olmadığı için reddedilir.
 */
export async function requireStaff(
  req: Request,
  supabase: SupabaseClient,
  options: { adminOnly?: boolean } = {},
): Promise<{ userId: string; role: string }> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new HttpError(401, "Yetkisiz istek");

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) throw new HttpError(401, "Yetkisiz istek");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role ?? "pending";
  const allowed = options.adminOnly ? role === "admin" : role === "admin" || role === "user";
  if (!allowed) throw new HttpError(403, "Bu işlem için yetkiniz yok");

  return { userId: data.user.id, role };
}

/** Zaman sabitli string karşılaştırması */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * WhatsApp kimlik bilgileri: önce Edge Function secret'ları,
 * yoksa veritabanı (yalnızca service_role okuyabilir).
 */
export async function getWhatsAppCredentials(supabase: SupabaseClient) {
  const { data: settings } = await supabase
    .from("whatsapp_settings")
    .select("phone_number_id, access_token, webhook_verify_token, is_active")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? settings?.phone_number_id ?? null;
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? settings?.access_token ?? null;
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? settings?.webhook_verify_token ?? null;

  return {
    isActive: !!settings?.is_active || !!Deno.env.get("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId,
    accessToken,
    verifyToken,
  };
}

/**
 * iyzico kimlik bilgileri: önce Edge Function secret'ları, yoksa veritabanı.
 */
export async function getIyzicoCredentials(supabase: SupabaseClient) {
  const { data: settings } = await supabase
    .from("iyzico_settings")
    .select("api_key, secret_key, base_url, is_active")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const apiKey = Deno.env.get("IYZICO_API_KEY") ?? settings?.api_key ?? null;
  const secretKey = Deno.env.get("IYZICO_SECRET_KEY") ?? settings?.secret_key ?? null;
  const baseUrl = Deno.env.get("IYZICO_BASE_URL") ?? settings?.base_url ?? "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    throw new HttpError(400, "iyzico ayarları bulunamadı");
  }
  return { apiKey, secretKey, baseUrl };
}
