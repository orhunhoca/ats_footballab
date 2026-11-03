import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  getWhatsAppCredentials,
  HttpError,
  jsonResponse,
  requireStaff,
  serviceClient,
} from "../_shared/security.ts";

const GRAPH_VERSION = "v21.0";

/** Türkiye numaralarını 905XXXXXXXXX biçimine çevirir; geçersizse null. */
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "90" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) return "90" + digits;
  if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

/** Şablon parametreleri satır sonu/tab içeremez, 4+ ardışık boşluk olamaz, boş olamaz. */
function cleanParam(value: unknown): string {
  const s = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim()
    .slice(0, 1000);
  return s || "-";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = serviceClient();
    // Yalnızca yönetim (admin + yönetici) mesaj gönderebilir; antrenörler gönderemez
    await requireStaff(req, supabaseClient, { managementOnly: true });

    const body = await req.json();
    const { phoneNumber, templateName, variables, messageType, messageContent } = body ?? {};

    if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      throw new HttpError(400, "Telefon numarası gerekli");
    }
    const to = normalizePhone(phoneNumber);
    if (!to) throw new HttpError(400, "Geçersiz telefon numarası");

    const settings = await getWhatsAppCredentials(supabaseClient);
    if (!settings.isActive || !settings.phoneNumberId || !settings.accessToken) {
      throw new HttpError(400, "WhatsApp yapılandırılmamış veya pasif");
    }

    let payload: Record<string, unknown>;

    if (typeof templateName === "string" && templateName) {
      // Şablon mesajı: template_type, template_name veya template_id ile bulunur
      const { data: candidates, error: templateError } = await supabaseClient
        .from("whatsapp_templates")
        .select("*")
        .or(
          `template_type.eq.${templateName.replace(/[^a-z0-9_]/gi, "")},template_id.eq.${
            templateName.replace(/[^a-z0-9_]/gi, "")
          }`,
        )
        .neq("status", "rejected")
        .order("created_at", { ascending: true })
        .limit(1);

      const template = candidates?.[0];
      if (templateError || !template) {
        throw new HttpError(400, `'${templateName}' şablonu bulunamadı veya reddedilmiş`);
      }
      if (!template.template_id) {
        throw new HttpError(
          400,
          "Şablonun Meta'daki adı (template_id) tanımlı değil. Şablonu Meta Business Manager'da oluşturup onaylatın.",
        );
      }

      const varNames: string[] = Array.isArray(template.variables) ? template.variables : [];
      const components = varNames.length > 0
        ? [{
          type: "body",
          parameters: varNames.map((name) => ({ type: "text", text: cleanParam(variables?.[name]) })),
        }]
        : undefined;

      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.template_id,
          language: { code: template.language || "tr" },
          components,
        },
      };
    } else if (messageType === "custom" && messageContent?.customText) {
      // Serbest metin: yalnızca kullanıcının son mesajından sonraki 24 saat içinde teslim edilir
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: String(messageContent.customText).slice(0, 4000) },
      };
    } else if (messageType === "document" && messageContent?.documentUrl) {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          link: messageContent.documentUrl,
          filename: messageContent.filename,
          caption: messageContent.caption,
        },
      };
    } else if (messageType === "image" && messageContent?.imageUrl) {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: { link: messageContent.imageUrl, caption: messageContent.caption },
      };
    } else {
      throw new HttpError(400, "Gönderilecek içerik belirtilmedi");
    }

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${settings.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const whatsappData = await whatsappResponse.json().catch(() => ({}));
    if (!whatsappResponse.ok) {
      const message = whatsappData?.error?.message || "Bilinmeyen hata";
      console.error("WhatsApp API error", whatsappResponse.status, whatsappData?.error?.code, message);
      throw new HttpError(502, `WhatsApp hatası: ${message}`);
    }

    return jsonResponse({ success: true, messageId: whatsappData.messages?.[0]?.id ?? null });
  } catch (error) {
    console.error("Error in send-whatsapp function:", error);
    return errorResponse(error);
  }
});
