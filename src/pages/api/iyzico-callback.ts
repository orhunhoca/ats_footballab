import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { iyzicoService } from "@/services/iyzicoService";
import { paymentService } from "@/services/paymentService";
import { whatsappService } from "@/services/whatsappService";
import { documentService } from "@/services/documentService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token gerekli" });
    }

    // Get iyzico settings
    const { data: settings } = await supabase
      .from("iyzico_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!settings) {
      throw new Error("iyzico ayarları bulunamadı");
    }

    // Retrieve payment result from iyzico
    const iyzicoUrl = `${settings.base_url}/payment/iyzipos/checkoutform/auth/ecom/detail`;
    
    const response = await fetch(iyzicoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `IYZWS ${settings.api_key}:${settings.secret_key}`,
      },
      body: JSON.stringify({
        locale: "tr",
        token: token,
      }),
    });

    const paymentResult = await response.json();

    if (paymentResult.status === "success" && paymentResult.paymentStatus === "SUCCESS") {
      // Get online payment record
      const { data: onlinePayment } = await supabase
        .from("online_payments")
        .select("*, students(name, father_phone, mother_phone)")
        .eq("token", token)
        .single();

      if (onlinePayment) {
        // Update online payment status
        await iyzicoService.updatePaymentStatus(
          onlinePayment.conversation_id,
          "success",
          paymentResult.paymentId
        );

        // Create payment_history record
        const paymentRecord = await paymentService.createPayment({
          studentId: onlinePayment.student_id,
          amount: onlinePayment.amount,
          paymentDate: new Date().toISOString(),
          paymentType: onlinePayment.payment_type,
          paymentMethod: "Online Ödeme",
          notes: `iyzico - ${paymentResult.paymentId}`,
        });

        if (paymentRecord) {
          // Generate and send receipt
          await documentService.generateAndSendPaymentReceipt(
            paymentRecord.id,
            true // sendViaWhatsApp
          );

          // Send success notification
          const student = onlinePayment.students as any;
          const parentPhone = student.father_phone || student.mother_phone;
          
          if (parentPhone) {
            try {
              await whatsappService.sendCustomMessage(
                parentPhone,
              `✅ ÖDEME BAŞARILI!\n\n` +
              `Öğrenci: ${student.name}\n` +
              `Tutar: ${onlinePayment.amount.toLocaleString("tr-TR")} TL\n` +
              `İşlem No: ${paymentResult.paymentId}\n\n` +
              `Ödeme makbuzunuz WhatsApp'tan gönderildi.\n\n` +
              `Teşekkür ederiz! ⚽`
              );
            } catch (notifyError) {
              // Bildirim gönderilemese de ödeme kaydı tamamlanmış sayılır
              console.error("Payment success WhatsApp notification failed:", notifyError);
            }
          }
        }
      }

      // Redirect to success page
      return res.redirect(302, `/payments?status=success&payment=${paymentResult.paymentId}`);
    } else {
      // Payment failed
      const { data: onlinePayment } = await supabase
        .from("online_payments")
        .select("conversation_id")
        .eq("token", token)
        .single();

      if (onlinePayment) {
        await iyzicoService.updatePaymentStatus(
          onlinePayment.conversation_id,
          "failed",
          undefined,
          paymentResult.errorMessage || "Ödeme başarısız"
        );
      }

      // Redirect to failed page
      return res.redirect(302, `/payments?status=failed&error=${encodeURIComponent(paymentResult.errorMessage || "Ödeme başarısız")}`);
    }
  } catch (error) {
    console.error("iyzico callback error:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Bilinmeyen hata" 
    });
  }
}