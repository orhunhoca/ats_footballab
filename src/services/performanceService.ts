import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PerformanceTest = Tables<"performance_tests">;
export type PerformanceTestInsert = TablesInsert<"performance_tests">;

export interface TestTypeInfo {
  value: string;
  label: string;
  unit: string;
  description: string;
}

export const TEST_TYPES: Record<string, TestTypeInfo> = {
  "10m_dribbling": {
    value: "10m_dribbling",
    label: "10m Top Sürme",
    unit: "saniye",
    description: "10 metre mesafede top kontrolü ile süre",
  },
  "20m_sprint": {
    value: "20m_sprint",
    label: "20m Sprint",
    unit: "saniye",
    description: "20 metre düz koşu süresi",
  },
  shooting_accuracy: {
    value: "shooting_accuracy",
    label: "Şut İsabeti",
    unit: "/ 10",
    description: "10 şut denemesinden kaç tanesinin hedefi bulduğu",
  },
  passing_accuracy: {
    value: "passing_accuracy",
    label: "Pas Doğruluğu",
    unit: "/ 10",
    description: "10 pas denemesinden kaç tanesinin başarılı olduğu",
  },
  dribbling_cone: {
    value: "dribbling_cone",
    label: "Koni Dribling",
    unit: "saniye",
    description: "Koniler arasında dribling süresi",
  },
  coordination: {
    value: "coordination",
    label: "Koordinasyon",
    unit: "/ 10",
    description: "Genel koordinasyon ve denge değerlendirmesi",
  },
};

// Create a new performance test
export async function createPerformanceTest(
  testData: PerformanceTestInsert
): Promise<PerformanceTest> {
  const { data, error } = await supabase
    .from("performance_tests")
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.error("Error creating performance test:", error);
    throw error;
  }

  return data;
}

// Get all tests for a student
export async function getStudentTests(
  studentId: string
): Promise<PerformanceTest[]> {
  const { data, error } = await supabase
    .from("performance_tests")
    .select("*")
    .eq("student_id", studentId)
    .order("test_date", { ascending: false });

  if (error) {
    console.error("Error fetching student tests:", error);
    throw error;
  }

  return data || [];
}

// Get tests by type for a student
export async function getStudentTestsByType(
  studentId: string,
  testType: string
): Promise<PerformanceTest[]> {
  const { data, error } = await supabase
    .from("performance_tests")
    .select("*")
    .eq("student_id", studentId)
    .eq("test_type", testType as any) // Type casting to bypass strict enum check for dynamic string
    .order("test_date", { ascending: true });

  if (error) {
    console.error("Error fetching tests by type:", error);
    throw error;
  }

  return data || [];
}

// Update test with AI analysis
export async function updateTestAnalysis(
  testId: string,
  aiAnalysis: string
): Promise<void> {
  const { error } = await supabase
    .from("performance_tests")
    .update({ ai_analysis: aiAnalysis })
    .eq("id", testId);

  if (error) {
    console.error("Error updating test analysis:", error);
    throw error;
  }
}

// Delete a test
export async function deletePerformanceTest(testId: string): Promise<void> {
  const { error } = await supabase
    .from("performance_tests")
    .delete()
    .eq("id", testId);

  if (error) {
    console.error("Error deleting performance test:", error);
    throw error;
  }
}

// Generate AI analysis for a student's progress
export async function generateAIAnalysis(
  studentId: string,
  studentName: string
): Promise<string> {
  try {
    const tests = await getStudentTests(studentId);

    if (tests.length === 0) {
      return "Henüz test verisi bulunmamaktadır.";
    }

    // Group tests by type
    const testsByType: Record<string, PerformanceTest[]> = {};
    tests.forEach((test) => {
      if (!testsByType[test.test_type]) {
        testsByType[test.test_type] = [];
      }
      testsByType[test.test_type].push(test);
    });

    // Prepare data for AI
    const analysisData = Object.entries(testsByType).map(([type, typeTests]) => {
      const testInfo = TEST_TYPES[type];
      const sortedTests = [...typeTests].sort(
        (a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
      );

      return {
        testType: testInfo.label,
        unit: testInfo.unit,
        results: sortedTests.map((t) => ({
          date: t.test_date,
          value: t.value,
        })),
        improvement:
          sortedTests.length > 1
            ? Number(sortedTests[sortedTests.length - 1].value) -
              Number(sortedTests[0].value)
            : 0,
      };
    });

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sen bir futbol antrenörü ve spor psikologusun. Genç futbolcuların performans verilerini analiz edip, gelişim raporları hazırlıyorsun. Türkçe, profesyonel ama sıcak bir dil kullan.",
          },
          {
            role: "user",
            content: `${studentName} adlı öğrencinin performans test sonuçlarını analiz et ve detaylı bir gelişim raporu hazırla:

${JSON.stringify(analysisData, null, 2)}

Lütfen şunları içeren bir rapor hazırla:
1. Genel Değerlendirme (güçlü ve geliştirilmesi gereken yönler)
2. Test Bazlı Analiz (her test için gelişim durumu)
3. Öneriler (antrenman tavsiyeleri ve hedefler)
4. Motivasyon Mesajı

Not: Düşük değerler iyi performans anlamına gelir (örn: 10m sprint'te düşük süre = hızlı). Yüksek değerler iyi performans anlamına gelir (örn: şut isabeti 8/10 = iyi).`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error("AI analizi başarısız oldu");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI analysis:", error);
    return "AI analizi oluşturulurken bir hata meydana geldi.";
  }
}