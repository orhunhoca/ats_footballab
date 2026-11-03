import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, HttpError, jsonResponse, serviceClient } from "../_shared/security.ts";
import {
  assertNotRateLimited,
  clientIp,
  consumeInvite,
  CURRENT_KVKK_VERSION,
  findValidInvite,
  recordAttempt,
  verifyParentIdentity,
} from "../_shared/parent.ts";

/**
 * Veli kaydı (davet kodu ile). Herkese açık uç nokta; güvenlik sunucuda sağlanır:
 *  - "KVKK Aydınlatma Metni'ni onaylamadan kayıt olunamaz": kvkk_accepted !== true ise HESAP HİÇ OLUŞTURULMAZ.
 *  - Geçerli davet kodu şart (yalnızca özeti saklanır) VE öğrenci adı + doğum tarihi + anne/baba cep telefonu
 *    öğrenci kaydıyla eşleşmeli; IP başına hatalı deneme sınırı vardır.
 *  - Onay kaydı (sürüm, tarih, IP, tarayıcı) consents tablosuna yazılır.
 *  - Supabase'in herkese açık kaydı kapalı kalmalıdır; veli hesabı yalnızca bu fonksiyonla oluşur.
 */
const OPTIONAL_CONSENTS: Record<string, string> = {
  health: "acik_riza_saglik",
  media_internal: "acik_riza_medya_ici",
  media_social: "acik_riza_medya_sosyal",
  whatsapp: "acik_riza_whatsapp",
  commercial: "acik_riza_ticari_ileti",
  abroad: "acik_riza_yurtdisi",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") throw new HttpError(405, "Geçersiz istek");
    const supabase = serviceClient();
    const ip = clientIp(req);
    const body = await req.json().catch(() => ({}));

    // Veli kaydı yönetici tarafından açılmadıysa hiçbir şey yapılmaz
    const { data: settings } = await supabase.from("company_settings").select("parent_portal_enabled").limit(1).maybeSingle();
    if (!settings?.parent_portal_enabled) throw new HttpError(403, "Veli kaydı şu anda kapalıdır.");

    // 1) KVKK onayı ZORUNLU (kod/e-posta kontrolünden önce)
    if (body.kvkk_accepted !== true) {
      throw new HttpError(400, "KVKK Aydınlatma Metni'ni onaylamadan kayıt olunamaz.");
    }
    if (body.kvkk_version !== CURRENT_KVKK_VERSION) {
      throw new HttpError(400, "KVKK metni güncellendi. Sayfayı yenileyip güncel metni onaylayın.");
    }

    // 2) Alan doğrulama
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (fullName.length < 2 || fullName.length > 100) throw new HttpError(400, "Ad soyad 2-100 karakter olmalı.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new HttpError(400, "Geçerli bir e-posta girin.");
    if (password.length < 8 || password.length > 72) throw new HttpError(400, "Şifre 8-72 karakter olmalı.");

    // 3) Davet kodu (hatalı denemeler sınırlanır)
    await assertNotRateLimited(supabase, ip);
    let invite;
    try {
      invite = await findValidInvite(supabase, body.code);
    } catch (e) {
      await recordAttempt(supabase, ip, false);
      throw e;
    }

    // 3b) İkinci doğrulama: öğrenci adı + doğum tarihi + anne/baba cep telefonu öğrenci kaydıyla eşleşmeli
    let relation: string;
    try {
      relation = await verifyParentIdentity(supabase, invite.student_id, {
        studentName: body.studentName,
        birthDate: body.studentBirthDate,
        phone: body.parentPhone,
      });
    } catch (e) {
      await recordAttempt(supabase, ip, false);
      throw e;
    }

    // 4) Hesabı oluştur
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created?.user) {
      const message = createError?.message ?? "Hesap oluşturulamadı";
      if (/already/i.test(message)) {
        throw new HttpError(409, "Bu e-posta ile zaten bir hesap var. Giriş yapın; başka bir çocuk için giriş yaptıktan sonra portaldan yeni kod ekleyebilirsiniz.");
      }
      throw new HttpError(400, message);
    }
    const userId = created.user.id;

    const rollback = async (reason: string): Promise<never> => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) console.error("Rollback failed:", error);
      throw new HttpError(400, reason);
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, email, full_name: fullName, role: "parent" });
    if (profileError) await rollback("Profil oluşturulamadı.");

    // 5) Davetin kullanım hakkını atomik tüket, çocuğa bağla
    if (!(await consumeInvite(supabase, invite))) {
      await rollback("Davet kodunun kullanım hakkı bitti. Lütfen okuldan yeni kod isteyin.");
    }
    const { error: linkError } = await supabase
      .from("parent_students")
      .insert({ parent_user_id: userId, student_id: invite.student_id, relation });
    if (linkError) await rollback("Öğrenci bağlantısı kurulamadı.");

    // 6) Onay kayıtları: KVKK (zorunlu, kabul) + isteğe bağlı açık rıza maddeleri (kabul veya ret)
    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300);
    const rows: Record<string, unknown>[] = [
      {
        user_id: userId,
        student_id: invite.student_id,
        document_type: "kvkk_aydinlatma",
        document_version: CURRENT_KVKK_VERSION,
        accepted: true,
        ip,
        user_agent: userAgent,
        source: "parent_registration",
      },
    ];
    const consents = body.consents && typeof body.consents === "object" ? body.consents : {};
    for (const [key, documentType] of Object.entries(OPTIONAL_CONSENTS)) {
      if (typeof consents[key] === "boolean") {
        rows.push({
          user_id: userId,
          student_id: invite.student_id,
          document_type: documentType,
          document_version: CURRENT_KVKK_VERSION,
          accepted: consents[key],
          ip,
          user_agent: userAgent,
          source: "parent_registration",
        });
      }
    }
    const { error: consentError } = await supabase.from("consents").insert(rows);
    if (consentError) await rollback("Onay kaydı oluşturulamadı; kayıt tamamlanmadı.");

    await recordAttempt(supabase, ip, true);
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
