import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  getIyzicoCredentials,
  HttpError,
  jsonResponse,
  requireStaff,
  serviceClient,
} from "../_shared/security.ts";
import { IYZICO_PATHS, iyzicoPost } from "../_shared/iyzico.ts";

/**
 * Kayıtlı iyzico anahtarlarını imzalı bir "taksit sorgusu" ile dener (para hareketi yoktur).
 * Yalnız yönetim çağırabilir. Yanıt: { success, mode: "test" | "canlı" }.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    await requireStaff(req, supabase, { managementOnly: true });
    const creds = await getIyzicoCredentials(supabase);

    const result = await iyzicoPost(creds, IYZICO_PATHS.installment, {
      locale: "tr",
      conversationId: `test-${Date.now()}`,
      binNumber: "554960",
      price: "100.0",
    });

    const mode = creds.baseUrl.includes("sandbox") ? "test" : "canlı";
    if (result.status !== "success") {
      throw new HttpError(400, String(result.errorMessage ?? "iyzico anahtarları kabul edilmedi"));
    }
    return jsonResponse({ success: true, mode });
  } catch (error) {
    return errorResponse(error);
  }
});
