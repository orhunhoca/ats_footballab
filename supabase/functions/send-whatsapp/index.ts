import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phoneNumber, templateName, variables, messageId } = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get WhatsApp settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from("whatsapp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (settingsError || !settings) {
      throw new Error("WhatsApp settings not found or inactive");
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
        text: variables[varName] || ""
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
      `https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.access_token}`,
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});