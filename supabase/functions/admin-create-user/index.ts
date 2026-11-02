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

    const { email, password, fullName } = await req.json();

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

    // Trigger profili 'pending' olarak oluşturur; personel rolünü burada veriyoruz.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName || email,
        role: "user",
      });

    if (profileError) {
      throw new HttpError(500, `Profil oluşturulamadı: ${profileError.message}`);
    }

    return jsonResponse({ success: true, user: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    return errorResponse(error);
  }
});
