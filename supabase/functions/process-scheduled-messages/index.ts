import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  getWhatsAppCredentials,
  requireStaff,
  safeEqual,
  serviceClient,
} from "../_shared/security.ts";

interface ScheduledMessage {
  id: string;
  message_type: string;
  recipient_phone: string;
  scheduled_for: string;
  status: string;
  message_content: any;
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = serviceClient();

    // Zamanlayıcı (cron) CRON_SECRET ile, kullanıcılar ise personel JWT'si ile çağırabilir
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret") ?? "";
    const isCron = !!cronSecret && !!providedSecret && safeEqual(providedSecret, cronSecret);
    if (!isCron) {
      await requireStaff(req, supabase);
    }

    // Get scheduler settings
    const { data: settings } = await supabase
      .from("message_scheduler_settings")
      .select("*")
      .single();

    // Check if scheduler is enabled
    if (!settings || !settings.enabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Scheduler is disabled",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get WhatsApp settings
    const whatsappSettings = await getWhatsAppCredentials(supabase);

    if (!whatsappSettings.isActive || !whatsappSettings.phoneNumberId || !whatsappSettings.accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "WhatsApp integration is not active",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get pending messages
    const now = new Date().toISOString();
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true });

    if (fetchError) throw fetchError;

    let successful = 0;
    let failed = 0;

    // Process each message
    for (const message of (pendingMessages as ScheduledMessage[]) || []) {
      try {
        const messageContent = message.message_content || {};
        
        // Prepare WhatsApp API request
        const whatsappApiUrl = `https://graph.facebook.com/v18.0/${whatsappSettings.phoneNumberId}/messages`;
        
        let whatsappPayload: any = {
          messaging_product: "whatsapp",
          to: message.recipient_phone,
        };

        if (messageContent.templateName) {
          // Template message
          whatsappPayload.type = "template";
          whatsappPayload.template = {
            name: messageContent.templateName,
            language: { code: "tr" },
            components: [
              {
                type: "body",
                parameters: Object.entries(messageContent.variables || {}).map(([key, value]) => ({
                  type: "text",
                  text: String(value),
                })),
              },
            ],
          };
        } else if (messageContent.customText) {
          // Text message
          whatsappPayload.type = "text";
          whatsappPayload.text = {
            body: messageContent.customText,
          };
        } else {
          throw new Error("Invalid message content");
        }

        // Send to WhatsApp
        const whatsappResponse = await fetch(whatsappApiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${whatsappSettings.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(whatsappPayload),
        });

        if (!whatsappResponse.ok) {
          const errorData = await whatsappResponse.json();
          throw new Error(errorData.error?.message || "WhatsApp API error");
        }

        const responseData = await whatsappResponse.json();

        // Update message status to sent
        await supabase
          .from("scheduled_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", message.id);

        // Record in whatsapp_messages
        await supabase.from("whatsapp_messages").insert({
          recipient_phone: message.recipient_phone,
          message_type: message.message_type,
          message_content: messageContent.customText || "",
          template_name: messageContent.templateName,
          template_variables: messageContent.variables,
          status: "sent",
          whatsapp_message_id: responseData.messages?.[0]?.id,
        });

        successful++;
      } catch (error) {
        // Update message status to failed
        await supabase
          .from("scheduled_messages")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", message.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: (pendingMessages || []).length,
        successful,
        failed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing scheduled messages:", error);
    return errorResponse(error);
  }
});
