import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError } from "./security.ts";

/**
 * Güncel KVKK Aydınlatma Metni sürümü. src/lib/legal.ts içindeki LEGAL_VERSION ile AYNI olmalıdır;
 * metin değiştirilirse ikisi birlikte güncellenir. Eski sürümü onaylayan kayıt reddedilir.
 */
export const CURRENT_KVKK_VERSION = "2026-11-v1";

const MAX_FAILED_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MINUTES = 15;

export function normalizeCode(raw: unknown): string {
  return String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return (forwarded.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 64);
}

/** Aynı IP'den kısa sürede çok sayıda başarısız kod denemesini engeller (kod tahminini zorlaştırır). */
export async function assertNotRateLimited(supabase: SupabaseClient, ip: string): Promise<void> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await supabase
    .from("registration_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("success", false)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    throw new HttpError(429, "Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.");
  }
}

export async function recordAttempt(supabase: SupabaseClient, ip: string, success: boolean): Promise<void> {
  await supabase.from("registration_attempts").insert({ ip, success });
}

export interface InviteRow {
  id: string;
  student_id: string;
  max_uses: number;
  used_count: number;
}

/** Kodu doğrular: özeti eşleşen, aktif, süresi dolmamış ve kullanım hakkı kalmış davet. */
export async function findValidInvite(supabase: SupabaseClient, code: unknown): Promise<InviteRow> {
  const normalized = normalizeCode(code);
  const invalid = new HttpError(400, "Davet kodu geçersiz, süresi dolmuş veya kullanım hakkı bitmiş.");
  if (normalized.length !== 8) throw invalid;

  const { data } = await supabase
    .from("parent_invites")
    .select("id, student_id, max_uses, used_count, expires_at, is_active")
    .eq("code_hash", await sha256Hex(normalized))
    .maybeSingle();

  if (!data || !data.is_active || new Date(data.expires_at).getTime() <= Date.now() || data.used_count >= data.max_uses) {
    throw invalid;
  }
  return { id: data.id, student_id: data.student_id, max_uses: data.max_uses, used_count: data.used_count };
}

/** Kullanım hakkını atomik tüketir (eşzamanlı iki kayıt aynı hakkı kullanamaz). */
export async function consumeInvite(supabase: SupabaseClient, invite: InviteRow): Promise<boolean> {
  const { data } = await supabase
    .from("parent_invites")
    .update({ used_count: invite.used_count + 1 })
    .eq("id", invite.id)
    .eq("used_count", invite.used_count)
    .eq("is_active", true)
    .select("id");
  return !!data && data.length === 1;
}
