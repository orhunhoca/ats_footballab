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

    // Get iyzico settings
    const { data: settings } = await supabase
      .from("iyzico_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!settings) {
      throw new Error("iyzico ayarları bulunamadı");
    }

    const body = await req.json();

    // Create iyzico payment request
    const iyzicoRequest = {
      locale: "tr",
      conversationId: body.conversationId,
      price: body.amount.toFixed(2),
      paidPrice: body.amount.toFixed(2),
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
        price: item.price.toFixed(2)
      }))
    };

    // Call iyzico API
    const iyzicoUrl = `${settings.base_url}/payment/iyzipos/checkoutform/initialize/auth/ecom`;
    
    const response = await fetch(iyzicoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `IYZWS ${settings.api_key}:${settings.secret_key}`,
      },
      body: JSON.stringify(iyzicoRequest),
    });

    const iyzicoResponse = await response.json();

    if (iyzicoResponse.status !== "success") {
      throw new Error(iyzicoResponse.errorMessage || "iyzico ödeme oluşturulamadı");
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentPageUrl: iyzicoResponse.paymentPageUrl,
        token: iyzicoResponse.token,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("iyzico payment error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});