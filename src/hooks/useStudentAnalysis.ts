import { useEffect, useMemo, useState } from "react";
import { analyzeStudentTests, type AnalysisTestRecord, type StudentAnalysis } from "@/lib/performanceAnalysis";
import { normService } from "@/services/normService";
import type { NormRef } from "@/lib/testNorms";

/** Öğrencinin test analizi; yaş bilinirse okul normları (yeterli veri varsa) yoksa başlangıç referansları eklenir. */
export function useStudentAnalysis(age: number | null | undefined, tests: AnalysisTestRecord[]): StudentAnalysis {
  const [schoolNorms, setSchoolNorms] = useState<Record<string, NormRef>>({});
  const base = useMemo(() => analyzeStudentTests(tests, { age }), [tests, age]);

  useEffect(() => {
    let cancelled = false;
    setSchoolNorms({});
    if (!age || base.metrics.length === 0) return;
    normService.getSchoolNorms(age, normService.directionsOf(base)).then((n) => {
      if (!cancelled) setSchoolNorms(n);
    });
    return () => {
      cancelled = true;
    };
  }, [age, base]);

  return useMemo(
    () => (Object.keys(schoolNorms).length > 0 ? analyzeStudentTests(tests, { age, schoolNorms }) : base),
    [tests, age, schoolNorms, base]
  );
}
