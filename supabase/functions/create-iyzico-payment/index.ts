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
import { functionUrl, IYZICO_PATHS, iyzicoPost } from "../_shared/iyzico.ts";

const PAYMENT_TYPES = ["registration", "summer_clothing", "winter_clothing", "other"];

/**
 * Yönetim için iyzico ödeme bağlantısı oluşturur ve online_payments kaydını SUNUCUDA yazar.
 * Girdi: { studentId, amount, paymentType, description? }  (tutarı sunucu doğrular, iyzico'ya sunucu gönderir)
 * Müşteri ödemeyi bitirince iyzico, iyzico-callback fonksiyonuna döner.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") throw new HttpError(405, "Geçersiz istek");
    const supabase = serviceClient();
    await requireStaff(req, supabase, { managementOnly: true });

    const body = await req.json().catch(() => ({}));
    const amount = Math.round(Number(body?.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new HttpError(400, "Geçersiz tutar");
    const paymentType = String(body?.paymentType ?? "other");
    if (!PAYMENT_TYPES.includes(paymentType)) throw new HttpError(400, "Geçersiz ödeme türü");
    const studentId = String(body?.studentId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) throw new HttpError(400, "Öğrenci gerekli");

    const { data: student } = await supabase
      .from("students")
      .select("id, name, mother_name, father_name, mother_phone, father_phone")
      .eq("id", studentId)
      .maybeSingle();
    if (!student) throw new HttpError(404, "Öğrenci bulunamadı");

    const creds = await getIyzicoCredentials(supabase);

    const conversationId = `${studentId}-${Date.now()}`;
    const payerName = String(student.father_name || student.mother_name || student.name || "Veli").trim();
    const [first, ...rest] = payerName.split(/\s+/);
    const phone = String(student.father_phone || student.mother_phone || "").replace(/\D/g, "");
    const description = String(body?.description || "FootbalLab ödemesi").slice(0, 120);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "85.34.78.112";
    const callbackUrl = functionUrl("iyzico-callback");
    const price = amount.toFixed(2);

    const result = await iyzicoPost(creds, IYZICO_PATHS.initialize, {
      locale: "tr",
      conversationId,
      price,
      paidPrice: price,
      currency: "TRY",
      basketId: `B-${Date.now()}`,
      paymentGroup: "PRODUCT",
      callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: studentId,
        name: first || "Veli",
        surname: rest.join(" ") || student.name || "Kullanıcı",
        gsmNumber: phone ? `+${phone.startsWith("90") ? phone : `90${phone.replace(/^0/, "")}`}` : undefined,
        email: "veli@footballab.com",
        identityNumber: "11111111111", // iyzico zorunlu alan; gerçek TC alınmıyor
        registrationAddress: "FootbalLab Futbol Okulu",
        ip,
        city: "Istanbul",
        country: "Turkey",
      },
      shippingAddress: { contactName: payerName, city: "Istanbul", country: "Turkey", address: "FootbalLab Futbol Okulu" },
      billingAddress: { contactName: payerName, city: "Istanbul", country: "Turkey", address: "FootbalLab Futbol Okulu" },
      basketItems: [
        { id: `ITEM-${Date.now()}`, name: description, category1: "Spor", category2: "Futbol", itemType: "VIRTUAL", price },
      ],
    });

    if (result.status !== "success" || !result.paymentPageUrl || !result.token) {
      throw new HttpError(502, String(result.errorMessage ?? "iyzico ödeme sayfası oluşturulamadı"));
    }

    const { error: insertError } = await supabase.from("online_payments").insert({
      student_id: studentId,
      amount,
      payment_type: paymentType,
      conversation_id: conversationId,
      payment_link: String(result.paymentPageUrl),
      token: String(result.token),
      callback_url: callbackUrl,
      status: "pending",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertError) throw new HttpError(500, "Ödeme kaydı oluşturulamadı");

    return jsonResponse({ success: true, paymentPageUrl: result.paymentPageUrl, conversationId });
  } catch (error) {
    console.error("iyzico payment error:", error);
    return errorResponse(error);
  }
});
