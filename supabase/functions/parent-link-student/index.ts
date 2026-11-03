import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, HttpError, jsonResponse, serviceClient } from "../_shared/security.ts";
import {
  assertNotRateLimited,
  clientIp,
  consumeInvite,
  findValidInvite,
  recordAttempt,
  verifyParentIdentity,
} from "../_shared/parent.ts";

/**
 * Giriş yapmış velinin portaldan yeni bir davet koduyla ikinci/üçüncü çocuğunu hesabına bağlaması.
 * Yalnızca rolü 'parent' olan kullanıcılar çağırabilir.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") throw new HttpError(405, "Geçersiz istek");
    const supabase = serviceClient();

    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) throw new HttpError(401, "Yetkisiz istek");
    const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !auth?.user) throw new HttpError(401, "Yetkisiz istek");
    const userId = auth.user.id;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    if (profile?.role !== "parent") throw new HttpError(403, "Bu işlem yalnızca veli hesapları içindir.");

    const body = await req.json().catch(() => ({}));
    const ip = clientIp(req);
    await assertNotRateLimited(supabase, ip);

    let invite;
    try {
      invite = await findValidInvite(supabase, body.code);
    } catch (e) {
      await recordAttempt(supabase, ip, false);
      throw e;
    }

    // İkinci doğrulama: öğrenci adı + doğum tarihi + anne/baba cep telefonu
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

    const { data: existing } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_user_id", userId)
      .eq("student_id", invite.student_id)
      .maybeSingle();
    if (existing) throw new HttpError(409, "Bu öğrenci zaten hesabınıza bağlı.");

    if (!(await consumeInvite(supabase, invite))) {
      throw new HttpError(400, "Davet kodunun kullanım hakkı bitti. Lütfen okuldan yeni kod isteyin.");
    }
    const { error: linkError } = await supabase
      .from("parent_students")
      .insert({ parent_user_id: userId, student_id: invite.student_id, relation });
    if (linkError) throw new HttpError(400, "Öğrenci bağlantısı kurulamadı.");

    await recordAttempt(supabase, ip, true);
    const { data: student } = await supabase.from("students").select("name").eq("id", invite.student_id).single();
    return jsonResponse({ success: true, studentName: student?.name ?? null });
  } catch (error) {
    return errorResponse(error);
  }
});
