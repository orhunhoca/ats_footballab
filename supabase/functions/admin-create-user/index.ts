import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  HttpError,
  jsonResponse,
  requireStaff,
  serviceClient,
} from "../_shared/security.ts";

/**
 * Admin'in yeni personel/antrenör hesabı açması için.
 * Supabase'de herkese açık kayıt (signup) kapatılabilsin diye kullanıcı
 * service_role ile sunucu tarafında oluşturulur ve rolü burada atanır.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = serviceClient();
    await requireStaff(req, supabase, { adminOnly: true });

    const { email, password, fullName, coach, role: requestedRole } = await req.json();

    // Yalnızca yönetici (manager) veya antrenör (user) hesabı açılabilir; admin buradan verilmez
    const newRole = requestedRole === "manager" ? "manager" : "user";

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "Geçersiz email");
    }
    if (typeof password !== "string" || password.length < 8) {
      throw new HttpError(400, "Şifre en az 8 karakter olmalı");
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email },
    });

    if (error || !data?.user) {
      const message = error?.message ?? "Kullanıcı oluşturulamadı";
      if (/already/i.test(message)) {
        throw new HttpError(409, "User already registered");
      }
      throw new HttpError(400, message);
    }

    const userId = data.user.id;

    // Sonraki adımlardan biri başarısız olursa yarım hesap bırakmamak için geri al
    const rollback = async (reason: string): Promise<never> => {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteError) console.error("Rollback failed:", deleteError);
      throw new HttpError(400, reason);
    };

    // Trigger profili 'pending' olarak oluşturur; personel rolünü burada veriyoruz.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email,
        full_name: fullName || email,
        role: newRole,
      });

    if (profileError) {
      await rollback(`Profil oluşturulamadı: ${profileError.message}`);
    }

    // İsteğe bağlı: antrenör kaydını aynı işlemde oluştur
    let coachRecord: Record<string, unknown> | null = null;
    if (newRole === "user" && coach && typeof coach === "object") {
      // Şube verilmişse var olan, aktif bir şube olmalı
      let branchId: string | null = null;
      if (coach.branch_id) {
        const { data: branch } = await supabase
          .from("branches")
          .select("id, is_active")
          .eq("id", String(coach.branch_id))
          .maybeSingle();
        if (!branch || !branch.is_active) {
          await rollback("Seçilen şube bulunamadı veya aktif değil");
        }
        branchId = branch!.id;
      }

      const { data: created, error: coachError } = await supabase
        .from("coaches")
        .insert({
          name: coach.name || fullName || email,
          phone: coach.phone ?? null,
          email,
          specialty: coach.specialty || null,
          experience: coach.experience || null,
          license: coach.license || null,
          status: coach.status || "Aktif",
          user_id: userId,
          branch_id: branchId,
          // "all": tüm şubelerde çalışabilir/kayıt ekleyebilir; "own": yalnızca kendi şubesi
          branch_access: coach.branch_access === "all" ? "all" : "own",
          invite_status: "accepted",
        })
        .select()
        .single();

      if (coachError) {
        await rollback(`Antrenör kaydı oluşturulamadı: ${coachError.message}`);
      }
      coachRecord = created;
    }

    return jsonResponse({
      success: true,
      user: { id: userId, email: data.user.email },
      coach: coachRecord,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
