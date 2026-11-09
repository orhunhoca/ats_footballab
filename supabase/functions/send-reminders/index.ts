import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  getWhatsAppCredentials,
  HttpError,
  jsonResponse,
  requireStaff,
  safeEqual,
  serviceClient,
} from "../_shared/security.ts";
import { type BalanceRow, type LogRow, type PlannedItem, planReminders, type Rule, type RuleType, type StudentRow, type TrialRow } from "./plan.ts";

/**
 * Otomatik hatırlatmalar: bakiye borcu, sağlık raporu, kayıt formu, deneme antrenmanı.
 * - Zamanlayıcı (pg_cron → pg_net) `x-cron-secret` = CRON_SECRET ile günlük çağırır (yalnız AÇIK kurallar işlenir).
 * - Yönetim (admin/yönetici) JWT'siyle `mode: "preview"` (kimseye gönderilmez; kuralın açık olması gerekmez)
 *   ya da `mode: "send"` (açık kurallar; WhatsApp bağlı olmalı) çağırabilir.
 * - Mesajlar onaylı Meta şablonlarıyla gider; değişkenler (veli adı, öğrenci adı, bakiye…) sistem tarafından doldurulur.
 * - Aynı veliye aynı hatırlatma, kuraldaki `repeat_days` süresi dolmadan tekrar gönderilmez (whatsapp_messages günlüğü).
 */

const GRAPH_VERSION = "v21.0";
const MAX_SEND_PER_RUN = 150;

function cleanParam(value: unknown): string {
  const s = String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 1000);
  return s || "-";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = serviceClient();

    // Zamanlayıcı anahtarı: Edge secret CRON_SECRET (varsa) ya da veritabanı Vault'undaki 'reminders_cron_secret'
    const provided = req.headers.get("x-cron-secret") ?? "";
    const envSecret = Deno.env.get("CRON_SECRET");
    let isCron = !!envSecret && !!provided && safeEqual(provided, envSecret);
    if (!isCron && provided) {
      const { data: ok } = await supabase.rpc("verify_reminders_cron_secret", { p: provided });
      isCron = ok === true;
    }
    if (!isCron) await requireStaff(req, supabase, { managementOnly: true });

    const body = await req.json().catch(() => ({}));
    const mode: "preview" | "send" = body?.mode === "preview" ? "preview" : "send";
    if (isCron && mode !== "send") throw new HttpError(400, "Zamanlayıcı yalnızca gönderim yapar");

    const now = new Date();
    // Türkiye saatine göre bugün (UTC+3): planlama günü
    const tr = new Date(now.getTime() + 3 * 3600_000);
    const today = new Date(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate());

    const { data: rulesData, error: rulesError } = await supabase.from("reminder_rules").select("*");
    if (rulesError) throw new HttpError(500, "Hatırlatma kuralları okunamadı");
    const rules = (rulesData ?? []) as Rule[];

    const [studentsRes, balancesRes, dueRes, trialsRes, groupsRes, schedRes, fieldsRes, logRes] = await Promise.all([
      supabase.from("students").select("id, name, status, mother_name, mother_phone, father_name, father_phone, health_report_submitted, registration_form_submitted").eq("status", "Aktif"),
      supabase.from("student_balances").select("student_id, balance, overdue_amount, next_due_date").gt("balance", 0),
      supabase.from("student_charge_status").select("student_id, due_date, remaining_amount").gt("remaining_amount", 0),
      supabase.from("trial_students").select("id, name, parent_name, parent_phone, trial_date, status, assigned_group_id").eq("status", "Beklemede"),
      supabase.from("groups").select("id, name, field_id"),
      supabase.from("group_schedule").select("group_id, day_of_week, start_time, end_time"),
      supabase.from("branch_fields").select("id, name"),
      supabase.from("whatsapp_messages").select("template_name, recipient_phone, created_at, status, template_variables")
        .gte("created_at", new Date(now.getTime() - 100 * 86_400_000).toISOString()),
    ]);
    for (const r of [studentsRes, balancesRes, dueRes, trialsRes, groupsRes, schedRes, fieldsRes, logRes]) {
      if (r.error) throw new HttpError(500, `Veri okunamadı: ${r.error.message}`);
    }

    // Ödenmemiş en eski vade
    const earliest = new Map<string, string>();
    for (const d of dueRes.data ?? []) {
      const cur = earliest.get(d.student_id);
      if (!cur || d.due_date < cur) earliest.set(d.student_id, d.due_date);
    }
    const balances: BalanceRow[] = (balancesRes.data ?? []).map((b) => ({
      student_id: b.student_id,
      balance: Number(b.balance),
      overdue_amount: Number(b.overdue_amount ?? 0),
      next_due_date: b.next_due_date,
      earliest_due: earliest.get(b.student_id) ?? null,
    }));

    // Deneme öğrencisi için "grup · gün saat · saha" özeti (deneme gününe denk gelen seans)
    const DAY = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const fieldName = new Map((fieldsRes.data ?? []).map((f) => [f.id, f.name]));
    const groupById = new Map((groupsRes.data ?? []).map((g) => [g.id, g]));
    const trials: TrialRow[] = (trialsRes.data ?? []).map((t) => {
      const g = t.assigned_group_id ? groupById.get(t.assigned_group_id) : null;
      let info: string | null = null;
      if (g) {
        const dow = new Date(`${t.trial_date}T12:00:00`).getDay();
        const sess = (schedRes.data ?? []).find((s) => s.group_id === g.id && s.day_of_week === dow);
        const parts = [g.name, sess ? `${DAY[dow]} ${String(sess.start_time).slice(0, 5)}-${String(sess.end_time).slice(0, 5)}` : null, g.field_id ? fieldName.get(g.field_id) : null].filter(Boolean);
        info = parts.join(" · ");
      }
      return { id: t.id, name: t.name, parent_name: t.parent_name, parent_phone: t.parent_phone, trial_date: t.trial_date, status: t.status, group_info: info };
    });

    const plan = planReminders({
      rules,
      students: (studentsRes.data ?? []) as StudentRow[],
      balances,
      trials,
      log: (logRes.data ?? []) as LogRow[],
      now: today,
      onlyEnabled: mode === "send",
    });

    const settings = await getWhatsAppCredentials(supabase);
    const whatsappActive = !!settings.isActive && !!settings.phoneNumberId && !!settings.accessToken;

    const results: Record<RuleType, (PlannedItem & { result?: "sent" | "failed" | "not_sent"; error?: string })[]> = {
      balance: [], health_report: [], registration_form: [], trial_lesson: [],
    };
    let sent = 0;
    let failed = 0;

    if (mode === "send" && whatsappActive) {
      const { data: templates } = await supabase.from("whatsapp_templates").select("*").neq("status", "rejected");
      for (const rule of rules) {
        if (!rule.enabled) continue;
        const tpl = (templates ?? []).find((t) => t.template_type === rule.template_type);
        for (const item of plan[rule.rule_type]) {
          const out: PlannedItem & { result?: "sent" | "failed" | "not_sent"; error?: string } = { ...item };
          results[rule.rule_type].push(out);
          if (item.status !== "planned" || !item.phone) continue;
          if (!tpl?.template_id) {
            out.result = "not_sent";
            out.error = "Şablonun Meta'daki adı tanımlı değil";
            continue;
          }
          if (sent + failed >= MAX_SEND_PER_RUN) {
            out.result = "not_sent";
            out.error = "Bu çalıştırmadaki sınıra ulaşıldı; yarın devam eder";
            continue;
          }
          const varNames: string[] = Array.isArray(tpl.variables) ? tpl.variables : [];
          const payload = {
            messaging_product: "whatsapp",
            to: item.phone,
            type: "template",
            template: {
              name: tpl.template_id,
              language: { code: tpl.language || "tr" },
              components: varNames.length
                ? [{ type: "body", parameters: varNames.map((n) => ({ type: "text", text: cleanParam(item.variables[n]) })) }]
                : undefined,
            },
          };
          let status: "sent" | "failed" = "failed";
          let waId: string | null = null;
          let errorText: string | null = null;
          try {
            const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${settings.phoneNumberId}/messages`, {
              method: "POST",
              headers: { Authorization: `Bearer ${settings.accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              status = "sent";
              waId = data?.messages?.[0]?.id ?? null;
            } else {
              errorText = String(data?.error?.message ?? `HTTP ${res.status}`).slice(0, 300);
            }
          } catch (e) {
            errorText = e instanceof Error ? e.message.slice(0, 300) : "Gönderim hatası";
          }
          // Okunabilir metin (şablon gövdesindeki {{n}} yerleri doldurulur)
          let preview = String(tpl.message_content ?? "");
          varNames.forEach((n, i) => (preview = preview.replace(`{{${i + 1}}}`, String(item.variables[n] ?? ""))));
          await supabase.from("whatsapp_messages").insert({
            recipient_phone: item.phone,
            recipient_name: item.recipient_name,
            message_content: preview,
            template_name: rule.template_type,
            template_variables: item.variables,
            student_id: item.student_id,
            message_type: "reminder",
            status,
            whatsapp_message_id: waId,
            error_message: errorText,
            sent_at: status === "sent" ? new Date().toISOString() : null,
          });
          out.result = status;
          if (errorText) out.error = errorText;
          if (status === "sent") sent++;
          else failed++;
          await new Promise((r) => setTimeout(r, 120)); // Meta hız sınırına saygı
        }
      }
    } else {
      for (const rule of rules) {
        if (mode === "send" && !rule.enabled) continue;
        results[rule.rule_type] = plan[rule.rule_type].map((i) => ({ ...i }));
      }
    }

    return jsonResponse({
      success: true,
      mode,
      whatsapp_active: whatsappActive,
      sent,
      failed,
      rules: rules.map((r) => ({
        rule_type: r.rule_type,
        enabled: r.enabled,
        planned: (results[r.rule_type] ?? []).filter((i) => i.status === "planned").length,
        skipped: (results[r.rule_type] ?? []).filter((i) => i.status === "skipped").length,
        items: (results[r.rule_type] ?? []).map((i) => ({
          student_name: i.student_name,
          recipient_name: i.recipient_name,
          phone: i.phone,
          status: i.status,
          reason: i.reason ?? null,
          result: (i as { result?: string }).result ?? null,
          error: (i as { error?: string }).error ?? null,
          variables: i.variables,
        })),
      })),
      note: mode === "send" && !whatsappActive ? "WhatsApp bağlı/etkin değil; mesaj gönderilmedi." : undefined,
    });
  } catch (error) {
    console.error("Error in send-reminders:", error);
    return errorResponse(error);
  }
});
