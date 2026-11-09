import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WaTemplate = Tables<"whatsapp_templates">;

export interface TemplateInput {
  template_name: string;
  template_id: string | null;
  message_content: string;
  variables: string[];
  status: string;
}

export const templateService = {
  async create(input: TemplateInput): Promise<void> {
    const { error } = await supabase.from("whatsapp_templates").insert({ ...input, template_type: "custom", language: "tr" });
    if (error) throw error;
  },
  async update(id: string, input: TemplateInput): Promise<void> {
    const { error } = await supabase.from("whatsapp_templates").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },
  /** Yalnız özel (template_type = custom) şablonlar silinir */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id).eq("template_type", "custom");
    if (error) throw error;
  },
};
