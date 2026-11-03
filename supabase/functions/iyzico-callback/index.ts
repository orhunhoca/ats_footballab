import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getIyzicoCredentials, serviceClient } from "../_shared/security.ts";
import { IYZICO_PATHS, iyzicoPost, siteUrl } from "../_shared/iyzico.ts";

/**
 * iyzico ödeme sayfasından dönen müşteri buraya gelir (herkese açık adres; güvenlik içeride):
 *  - Gelen token'a GÜVENİLMEZ: sonucu iyzico'dan imzalı istekle kendimiz sorgularız.
 *  - Token, bizim oluşturduğumuz bir online_payments kaydıyla eşleşmeli; konuşma no ve tutar da tutmalı.
 *  - Aynı ödeme birden çok kez gelse bile payment_history'ye YALNIZ BİR KEZ yazılır (atomik sahiplenme).
 */
function redirect(status: "success" | "failed", extra: Record<string, string>): Response {
  const qs = new URLSearchParams({ status, ...extra }).toString();
  return new Response(null, { status: 303, headers: { Location: `${siteUrl()}/payments?${qs}` } });
}

async function readToken(req: Request): Promise<string> {
  const url = new URL(req.url);
  let token = url.searchParams.get("token") ?? "";
  if (!token && req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    try {
      if (type.includes("application/json")) token = String((await req.json())?.token ?? "");
      else token = String((await req.formData()).get("token") ?? "");
    } catch {
      /* gövde okunamadı */
    }
  }
  return token.trim().slice(0, 200);
}

const istanbulToday = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

serve(async (req) => {
  try {
    const token = await readToken(req);
    if (!token) return redirect("failed", { error: "Ödeme bilgisi alınamadı" });

    const supabase = serviceClient();
    const { data: row } = await supabase
      .from("online_payments")
      .select("id, student_id, amount, payment_type, conversation_id, status")
      .eq("token", token)
      .maybeSingle();
    if (!row) return redirect("failed", { error: "Ödeme kaydı bulunamadı" });

    // Aynı dönüş tekrar gelirse (yenileme, çift tıklama) tekrar işlenmez
    if (row.status === "success") return redirect("success", { payment: row.conversation_id });

    const creds = await getIyzicoCredentials(supabase);
    const result = await iyzicoPost(creds, IYZICO_PATHS.detail, {
      locale: "tr",
      conversationId: row.conversation_id,
      token,
    });

    const paid = result.status === "success" && result.paymentStatus === "SUCCESS";
    if (!paid) {
      const message = String(result.errorMessage ?? "Ödeme tamamlanamadı");
      await supabase.from("online_payments").update({ status: "failed", error_message: message.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", row.id).neq("status", "success");
      return redirect("failed", { error: message });
    }

    // Güvenlik: iyzico'nun bildirdiği konuşma no ve tutar bizim kaydımızla birebir tutmalı
    const sameConversation = String(result.conversationId ?? "") === row.conversation_id;
    const sameAmount = Math.abs(Number(result.paidPrice) - Number(row.amount)) < 0.005;
    if (!sameConversation || !sameAmount) {
      const message = `Tutar/işlem uyuşmazlığı (iyzico: ${result.paidPrice}, kayıt: ${row.amount}). iyzico panelini kontrol edin.`;
      console.error("iyzico mismatch", { conversation: row.conversation_id, paidPrice: result.paidPrice, amount: row.amount });
      await supabase.from("online_payments").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", row.id).neq("status", "success");
      return redirect("failed", { error: "Ödeme doğrulanamadı; lütfen okulla iletişime geçin" });
    }

    const iyzicoPaymentId = String(result.paymentId ?? "");

    // Atomik sahiplenme: yalnız 'success' olmayan kaydı güncelleyen ilk istek ödemeyi işler
    const { data: claimed } = await supabase
      .from("online_payments")
      .update({ status: "success", iyzico_payment_id: iyzicoPaymentId, completed_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .neq("status", "success")
      .select("id");
    if (!claimed || claimed.length === 0) return redirect("success", { payment: iyzicoPaymentId });

    const { data: history, error: historyError } = await supabase
      .from("payment_history")
      .insert({
        student_id: row.student_id,
        amount: row.amount,
        payment_method: "Online Ödeme",
        payment_type: row.payment_type,
        payment_date: istanbulToday(),
        notes: `iyzico - ${iyzicoPaymentId}`,
      })
      .select("id")
      .single();

    if (historyError || !history) {
      // Kayıt yazılamadıysa durumu geri al ki yeniden denenebilsin; yöneticiye görünür
      console.error("payment_history insert failed:", historyError);
      await supabase.from("online_payments").update({ status: "pending", error_message: "Ödeme alındı ama kayıt oluşturulamadı; yöneticiye bildirin", updated_at: new Date().toISOString() }).eq("id", row.id);
      return redirect("failed", { error: "Ödemeniz alındı ancak kaydedilemedi. Lütfen okulla iletişime geçin" });
    }

    await supabase.from("online_payments").update({ payment_history_id: history.id }).eq("id", row.id);
    return redirect("success", { payment: iyzicoPaymentId });
  } catch (error) {
    console.error("iyzico callback error:", error);
    return redirect("failed", { error: "Ödeme sonucu alınamadı; lütfen okulla iletişime geçin" });
  }
});
