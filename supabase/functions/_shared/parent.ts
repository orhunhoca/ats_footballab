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

/** Türkçe karakter ve büyük/küçük harf farklarını yok sayarak adı karşılaştırılabilir hâle getirir. */
export function normalizeName(raw: unknown): string {
  return String(raw ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Telefonun son 10 hanesi (0532..., +90532..., 532... hepsi aynı numaraya indirgenir). */
export function lastTenDigits(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export const IDENTITY_MISMATCH_MESSAGE =
  "Girdiğiniz öğrenci bilgileri okul kaydıyla eşleşmedi. Öğrencinin adını, doğum tarihini ve anne/baba cep telefonunu okula kayıtlı olduğu şekilde girin.";

/**
 * Kodun bağlı olduğu öğrenci kaydıyla veli beyanını doğrular: öğrenci adı + doğum tarihi + anne/baba cep telefonu.
 * Davet kodunun yanında ikinci doğrulama katmanıdır. Yakınlık (Anne/Baba) telefondan türetilir.
 */
export async function verifyParentIdentity(
  supabase: SupabaseClient,
  studentId: string,
  input: { studentName: unknown; birthDate: unknown; phone: unknown },
): Promise<"Anne" | "Baba" | "Veli"> {
  const { data: student } = await supabase
    .from("students")
    .select("name, birth_date, mother_phone, father_phone")
    .eq("id", studentId)
    .maybeSingle();

  const motherPhone = lastTenDigits(student?.mother_phone);
  const fatherPhone = lastTenDigits(student?.father_phone);
  if (!student || !student.birth_date || (!motherPhone && !fatherPhone)) {
    throw new HttpError(400, "Öğrenci kaydında doğrulama bilgisi eksik. Lütfen okulla iletişime geçin.");
  }

  const phone = lastTenDigits(input.phone);
  const nameOk = normalizeName(input.studentName) !== "" && normalizeName(input.studentName) === normalizeName(student.name);
  const dateOk = String(input.birthDate ?? "") === String(student.birth_date);
  const isMother = !!phone && phone === motherPhone;
  const isFather = !!phone && phone === fatherPhone;

  if (!nameOk || !dateOk || (!isMother && !isFather)) throw new HttpError(400, IDENTITY_MISMATCH_MESSAGE);
  return isMother && !isFather ? "Anne" : isFather && !isMother ? "Baba" : "Veli";
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
