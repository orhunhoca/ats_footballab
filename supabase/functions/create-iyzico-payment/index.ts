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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = serviceClient();

    // Yalnızca giriş yapmış personel/admin ödeme linki oluşturabilir
    await requireStaff(req, supabase);

    const { apiKey, secretKey, baseUrl } = await getIyzicoCredentials(supabase);

    const body = await req.json();

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, "Geçersiz tutar");
    }
    if (!Array.isArray(body?.basketItems) || body.basketItems.length === 0) {
      throw new HttpError(400, "Sepet boş olamaz");
    }

    // Create iyzico payment request
    const iyzicoRequest = {
      locale: "tr",
      conversationId: body.conversationId,
      price: amount.toFixed(2),
      paidPrice: amount.toFixed(2),
      currency: "TRY",
      basketId: body.basketId,
      paymentGroup: "PRODUCT",
      callbackUrl: body.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: body.buyer,
      shippingAddress: body.billingAddress,
      billingAddress: body.billingAddress,
      basketItems: body.basketItems.map((item: any) => ({
        ...item,
        price: Number(item.price).toFixed(2),
      })),
    };

    // Call iyzico API
    const iyzicoUrl = `${baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecom`;

    const response = await fetch(iyzicoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `IYZWS ${apiKey}:${secretKey}`,
      },
      body: JSON.stringify(iyzicoRequest),
    });

    const iyzicoResponse = await response.json();

    if (iyzicoResponse.status !== "success") {
      throw new HttpError(502, iyzicoResponse.errorMessage || "iyzico ödeme oluşturulamadı");
    }

    return jsonResponse({
      success: true,
      paymentPageUrl: iyzicoResponse.paymentPageUrl,
      token: iyzicoResponse.token,
    });
  } catch (error) {
    console.error("iyzico payment error:", error);
    return errorResponse(error);
  }
});
