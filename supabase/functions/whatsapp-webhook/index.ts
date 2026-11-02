import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  getWhatsAppCredentials,
  hmacSha256Hex,
  safeEqual,
  serviceClient,
} from "../_shared/security.ts";

/**
 * Meta, her webhook isteğini uygulama sırrı (App Secret) ile imzalar:
 *   X-Hub-Signature-256: sha256=<hex hmac>
 * WHATSAPP_APP_SECRET tanımlı değilse istekler reddedilir (fail-closed).
 */
async function verifyMetaSignature(req: Request, rawBody: string): Promise<boolean> {
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) {
    console.error("WHATSAPP_APP_SECRET tanımlı değil; webhook istekleri reddediliyor");
    return false;
  }
  const header = req.headers.get("x-hub-signature-256") ?? "";
  if (!header.startsWith("sha256=")) return false;
  const expected = await hmacSha256Hex(appSecret, rawBody);
  return safeEqual(header.slice("sha256=".length).toLowerCase(), expected);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = serviceClient();

    // Meta webhook doğrulama adımı (abonelik kurulurken GET ile gelir)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token") ?? "";
      const challenge = url.searchParams.get("hub.challenge") ?? "";
      const { verifyToken } = await getWhatsAppCredentials(supabase);

      if (mode === "subscribe" && verifyToken && safeEqual(token, verifyToken)) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const rawBody = await req.text();
    if (!(await verifyMetaSignature(req, rawBody))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = JSON.parse(rawBody);

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        // Filtre enjeksiyonunu önlemek için yalnızca rakamlar
        const fromPhone = String(message.from ?? "").replace(/\D/g, "");
        const messageText = message.text?.body || "";
        const messageId = message.id;

        const student = await supabase
          .from("students")
          .select("id, name, father_phone, mother_phone")
          .or(`father_phone.eq.${fromPhone},mother_phone.eq.${fromPhone}`)
          .single();

        let botResponse = "";
        let commandType = "";

        if (messageText.toLowerCase().startsWith("#yoklama")) {
          commandType = "attendance";
          if (student.data) {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const attendance = await supabase
              .from("attendance")
              .select("status")
              .eq("student_id", student.data.id)
              .gte("attendance_date", monthStart.toISOString());

            const total = attendance.data?.length || 0;
            const present = attendance.data?.filter(a => a.status === "present").length || 0;
            
            botResponse = `${student.data.name} için bu ayki yoklama durumu:\n\n✅ Katıldı: ${present}\n❌ Katılmadı: ${total - present}\n📊 Toplam: ${total}`;
          } else {
            botResponse = "Telefon numaranız sistemde kayıtlı değil. Lütfen okul ile iletişime geçin.";
          }
        } else if (messageText.toLowerCase().startsWith("#odeme")) {
          commandType = "payment";
          if (student.data) {
            const payments = await supabase
              .from("payment_history")
              .select("amount, payment_date, payment_type")
              .eq("student_id", student.data.id)
              .order("payment_date", { ascending: false })
              .limit(5);

            if (payments.data && payments.data.length > 0) {
              botResponse = `${student.data.name} için son ödemeler:\n\n`;
              payments.data.forEach(p => {
                const date = new Date(p.payment_date).toLocaleDateString("tr-TR");
                botResponse += `📅 ${date} - ${p.amount} TL (${p.payment_type || "Ödeme"})\n`;
              });
            } else {
              botResponse = "Henüz ödeme kaydı bulunmamaktadır.";
            }
          } else {
            botResponse = "Telefon numaranız sistemde kayıtlı değil. Lütfen okul ile iletişime geçin.";
          }
        } else if (messageText.toLowerCase().startsWith("#program")) {
          commandType = "schedule";
          if (student.data) {
            const groups = await supabase
              .from("student_groups")
              .select("group_id, groups(name)")
              .eq("student_id", student.data.id);

            if (groups.data && groups.data.length > 0) {
              const groupId = groups.data[0].group_id;
              const schedule = await supabase
                .from("group_schedule")
                .select("day_of_week, start_time, end_time")
                .eq("group_id", groupId)
                .order("day_of_week");

              const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
              botResponse = `${student.data.name} - Antrenman Programı:\n\n`;
              
              if (schedule.data) {
                schedule.data.forEach(s => {
                  botResponse += `${days[s.day_of_week]} ${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}\n`;
                });
              }
            } else {
              botResponse = "Öğrenci henüz bir gruba atanmamış.";
            }
          } else {
            botResponse = "Telefon numaranız sistemde kayıtlı değil. Lütfen okul ile iletişime geçin.";
          }
        } else if (messageText.toLowerCase().startsWith("#iletisim")) {
          commandType = "contact";
          botResponse = "📞 SPORTEX FUTBOL OKULU\n\n📱 Telefon: 0XXX XXX XX XX\n📧 E-posta: info@sportex.com\n📍 Adres: [Adres bilgisi]\n\n🕐 Çalışma Saatleri:\nPazartesi-Cuma: 09:00-18:00";
        } else {
          commandType = "help";
          botResponse = "👋 Merhaba! Size nasıl yardımcı olabilirim?\n\n📋 Komutlar:\n#yoklama - Yoklama durumu\n#odeme - Ödeme bilgileri\n#program - Antrenman programı\n#iletisim - İletişim bilgileri\n\nℹ️ Diğer sorularınız için lütfen okul ile iletişime geçin.";
        }

        await supabase.from("whatsapp_chatbot_logs").insert({
          phone_number: fromPhone,
          student_id: student.data?.id || null,
          incoming_message: messageText,
          bot_response: botResponse,
          command_type: commandType,
        });

        const settings = await getWhatsAppCredentials(supabase);

        if (settings.phoneNumberId && settings.accessToken) {
          const whatsappUrl = `https://graph.facebook.com/v17.0/${settings.phoneNumberId}/messages`;
          
          await fetch(whatsappUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${settings.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: fromPhone,
              type: "text",
              text: { body: botResponse },
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});