import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";
import { normService } from "@/services/normService";
import {
  analyzeStudentTests,
  buildParentSummary,
  buildRuleBasedAnalysis,
  toAiPayload,
} from "@/lib/performanceAnalysis";

export interface StudentAnalysisResult {
  /** Markdown rapor (koç için) */
  analysis: string;
  /** Veliye gidecek tek satırlık değerlendirme */
  parentSummary: string;
  /** "ai": yapay zekâ üretti, "rule": kayıtlı verilerden kural tabanlı üretildi */
  source: "ai" | "rule";
  /** Yapay zekâ kullanılamadıysa nedeni (kullanıcıya gösterilir) */
  notice?: string;
}

export type PerformanceTest = Tables<"performance_tests"> & {
  test_protocols?: {
    id: string;
    name: string;
    category: string;
    unit: string;
  } | null;
};

export type PerformanceTestInsert = Database["public"]["Tables"]["performance_tests"]["Insert"];
export type PerformanceTestUpdate = Database["public"]["Tables"]["performance_tests"]["Update"];

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

  // Öğrenci analizi: önce gerçek verilerden kural tabanlı rapor üretilir,
  // yapay zekâ servisi yapılandırılmışsa rapor onunla zenginleştirilir.
  async analyzeStudent(
    student: { name: string; age?: number | null },
    tests: PerformanceTest[]
  ): Promise<StudentAnalysisResult> {
    // Önce normsuz analizle yönleri çıkar, okul normlarını çek, sonra normlu analizi kur
    const base = analyzeStudentTests(tests, { age: student.age });
    const schoolNorms = await normService.getSchoolNorms(student.age, normService.directionsOf(base));
    const stats = Object.keys(schoolNorms).length > 0 ? analyzeStudentTests(tests, { age: student.age, schoolNorms }) : base;
    const ruleBased: StudentAnalysisResult = {
      analysis: buildRuleBasedAnalysis(student.name, student.age, stats),
      parentSummary: buildParentSummary(stats),
      source: "rule",
    };

    if (stats.metrics.length === 0) return ruleBased;

    try {
      const { data, error } = await supabase.functions.invoke("analyze-performance", {
        body: toAiPayload(student.age, stats),
      });

      if (error) throw error;
      if (!data?.configured) {
        return {
          ...ruleBased,
          notice: "Yapay zekâ anahtarı tanımlı değil; kayıtlı verilere dayalı otomatik analiz gösteriliyor.",
        };
      }
      if (!data.analysis) throw new Error("Boş yanıt");

      return {
        analysis: `# ${student.name} İçin Performans Analizi\n\n${data.analysis}`,
        parentSummary: data.parentSummary || ruleBased.parentSummary,
        source: "ai",
      };
    } catch (error) {
      console.error("AI analysis unavailable, using rule-based analysis:", error);
      return {
        ...ruleBased,
        notice: "Yapay zekâ servisine ulaşılamadı; kayıtlı verilere dayalı otomatik analiz gösteriliyor.",
      };
    }
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

  // Get group performance comparison
  async getGroupPerformanceComparison(groupId?: string): Promise<any[]> {
    let query = supabase
      .from("performance_tests")
      .select(`
        *,
        students!performance_tests_student_id_fkey(
          id,
          name,
          student_groups!student_groups_student_id_fkey(
            group_id,
            groups!student_groups_group_id_fkey(
              id,
              name
            )
          )
        ),
        test_protocols(
          id,
          name,
          category,
          unit
        )
      `)
      .order("test_date", { ascending: false });

    if (groupId) {
      // Filter by specific group through student_groups relationship
      const { data: studentIds } = await supabase
        .from("student_groups")
        .select("student_id")
        .eq("group_id", groupId);
      
      if (studentIds && studentIds.length > 0) {
        const ids = studentIds.map(s => s.student_id);
        query = query.in("student_id", ids);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching group performance:", error);
      throw error;
    }

    return data || [];
  },

  // Calculate performance statistics
  async getPerformanceStats(studentId: string): Promise<{
    totalTests: number;
    improvementRate: number;
    averageScore: number;
    lastTestDate: string | null;
  }> {
    const tests = await this.getStudentPerformanceTests(studentId);
    
    if (tests.length === 0) {
      return {
        totalTests: 0,
        improvementRate: 0,
        averageScore: 0,
        lastTestDate: null
      };
    }

    // Calculate improvement rate (comparing first vs last tests by protocol)
    const testsByProtocol: Record<string, PerformanceTest[]> = {};
    tests.forEach(test => {
      const key = test.test_protocol_id || test.test_type || "other";
      if (!testsByProtocol[key]) {
        testsByProtocol[key] = [];
      }
      testsByProtocol[key].push(test);
    });

    let totalImprovement = 0;
    let protocolsWithMultipleTests = 0;

    Object.values(testsByProtocol).forEach(protocolTests => {
      if (protocolTests.length >= 2) {
        const sorted = protocolTests.sort((a, b) => 
          new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
        );
        const first = Number(sorted[0].value);
        const last = Number(sorted[sorted.length - 1].value);
        const improvement = ((last - first) / first) * 100;
        totalImprovement += improvement;
        protocolsWithMultipleTests++;
      }
    });

    const improvementRate = protocolsWithMultipleTests > 0 
      ? totalImprovement / protocolsWithMultipleTests 
      : 0;

    // Calculate average score
    const averageScore = tests.reduce((sum, t) => sum + Number(t.value), 0) / tests.length;

    // Get last test date
    const sortedByDate = [...tests].sort((a, b) => 
      new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    );
    const lastTestDate = sortedByDate[0]?.test_date || null;

    return {
      totalTests: tests.length,
      improvementRate: Math.round(improvementRate * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      lastTestDate
    };
  },
};
