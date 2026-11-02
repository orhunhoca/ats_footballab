import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  getWhatsAppCredentials,
  HttpError,
  requireStaff,
  serviceClient,
} from "../_shared/security.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (service role, yalnızca sunucu tarafında)
    const supabaseClient = serviceClient();

    // Yalnızca giriş yapmış personel/admin mesaj gönderebilir
    await requireStaff(req, supabaseClient);

    const { phoneNumber, templateName, variables } = await req.json();

    if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      throw new HttpError(400, "Telefon numarası gerekli");
    }

    // Get WhatsApp settings
    const settings = await getWhatsAppCredentials(supabaseClient);
    if (!settings.isActive || !settings.phoneNumberId || !settings.accessToken) {
      throw new HttpError(400, "WhatsApp settings not found or inactive");
    }

    // Get template details
    const { data: template, error: templateError } = await supabaseClient
      .from("whatsapp_templates")
      .select("*")
      .eq("name", templateName)
      .eq("status", "approved")
      .single();

    if (templateError || !template) {
      throw new Error(`Template '${templateName}' not found or not approved`);
    }

    // Format phone number (remove spaces, dashes, and add country code if missing)
    let formattedPhone = phoneNumber.replace(/[\s-]/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+90" + formattedPhone; // Turkey country code
    }

    // Build template components with variables
    const components = [];
    
    if (template.template_variables && Array.isArray(template.template_variables)) {
      const bodyParameters = template.template_variables.map((varName: string) => ({
        type: "text",
        text: variables?.[varName] || ""
      }));

      if (bodyParameters.length > 0) {
        components.push({
          type: "body",
          parameters: bodyParameters
        });
      }
    }

    // Send message via WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "template",
          template: {
            name: template.template_id,
            language: {
              code: "tr" // Turkish
            },
            components: components.length > 0 ? components : undefined
          }
        }),
      }
    );

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json();
      throw new Error(
        `WhatsApp API error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const whatsappData = await whatsappResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: whatsappData.messages[0].id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-whatsapp function:", error);
    return errorResponse(error);
  }
});
