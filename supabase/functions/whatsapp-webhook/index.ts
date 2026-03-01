import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const fromPhone = message.from;
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

        const settings = await supabase
          .from("whatsapp_settings")
          .select("phone_number_id, access_token")
          .eq("is_active", true)
          .single();

        if (settings.data) {
          const whatsappUrl = `https://graph.facebook.com/v17.0/${settings.data.phone_number_id}/messages`;
          
          await fetch(whatsappUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${settings.data.access_token}`,
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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});