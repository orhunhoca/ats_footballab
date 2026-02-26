import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PerformanceTest = Tables<"performance_tests"> & {
  test_protocols?: {
    id: string;
    name: string;
    category: string;
    unit: string;
  } | null;
};

export type PerformanceTestInsert = TablesInsert<"performance_tests">;
export type PerformanceTestUpdate = TablesUpdate<"performance_tests">;

export const performanceService = {
  // Alias for backward compatibility
  async getStudentTests(studentId: string): Promise<PerformanceTest[]> {
    return this.getStudentPerformanceTests(studentId);
  },

  // Get all performance tests for a student
  async getStudentPerformanceTests(studentId: string): Promise<PerformanceTest[]> {
    const { data, error } = await supabase
      .from("performance_tests")
      .select(`
        *,
        test_protocols (
          id,
          name,
          category,
          unit
        )
      `)
      .eq("student_id", studentId)
      .order("test_date", { ascending: false });

    if (error) {
      console.error("Error fetching performance tests:", error);
      throw error;
    }

    return data || [];
  },

  // Generate AI Analysis (Mock implementation for now)
  async generateAIAnalysis(studentId: string, studentName: string): Promise<string> {
    // In a real app, this would call an Edge Function with OpenAI
    // For now, return a simulated analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return `
# ${studentName} İçin Performans Analizi

## Genel Değerlendirme
Öğrencinin son test verilerine göre hız ve çabukluk parametrelerinde belirgin bir artış gözlenmektedir. Özellikle son 3 ayda yapılan sprint testlerinde %12'lik bir gelişim kaydedilmiştir.

## Güçlü Yönler
- **Patlayıcı Kuvvet:** Dikey sıçrama testlerinde yaş grubunun üzerinde performans.
- **Sprint:** 20m sprint derecesi istikrarlı şekilde düşüyor.

## Gelişim Alanları
- **Dayanıklılık:** Yo-Yo test sonuçları aerobik kapasitenin artırılması gerektiğini işaret ediyor.
- **Esneklik:** Hamstring esnekliği sakatlık riski açısından geliştirilmeli.

## Öneriler
Haftalık antrenman programına 20 dakika ekstra dayanıklılık koşuları ve düzenli stretching rutini eklenmesi önerilir.
    `.trim();
  },

  // Create new performance test
  async createPerformanceTest(test: PerformanceTestInsert): Promise<PerformanceTest> {
    const { data, error } = await supabase
      .from("performance_tests")
      .insert(test)
      .select()
      .single();

    if (error) {
      console.error("Error creating performance test:", error);
      throw error;
    }

    return data;
  },

  // Update performance test
  async updatePerformanceTest(id: string, updates: PerformanceTestUpdate): Promise<PerformanceTest> {
    const { data, error } = await supabase
      .from("performance_tests")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating performance test:", error);
      throw error;
    }

    return data;
  },

  // Delete performance test
  async deletePerformanceTest(id: string): Promise<void> {
    const { error } = await supabase
      .from("performance_tests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting performance test:", error);
      throw error;
    }
  },
};
