import { analyzeStudentTests, type MetricSummary } from "@/lib/performanceAnalysis";
import type { PerformanceTestRow } from "@/services/reportService";

export interface MetricAggregate {
  key: string;
  name: string;
  category: string;
  unit: string;
  direction: "lower" | "higher";
  students: number;
  tests: number;
  /** Öğrencilerin dönemdeki son ölçümlerinin ortalaması */
  avgLatest: number;
  /** Dönemde en az 2 ölçümü olan öğrencilerin ortalama değişimi (%; + = gelişim) */
  avgChangePct: number | null;
  improving: number;
  declining: number;
  stable: number;
}

export interface StudentProgress {
  student_id: string;
  name: string;
  /** İşaretli ortalama değişim (%; + = gelişim) */
  avgChangePct: number;
  metrics: number;
}

export interface PerformanceSummary {
  totalTests: number;
  testedStudents: number;
  byMetric: MetricAggregate[];
  byCategory: { category: string; avgChangePct: number | null; students: number }[];
  mostImproved: StudentProgress[];
  mostDeclined: StudentProgress[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Dönemde yapılan testleri mevcut analiz motoruyla öğrenci bazında çözüp okul/şube düzeyinde özetler. */
export function summarizePerformance(tests: PerformanceTestRow[]): PerformanceSummary {
  const byStudent = new Map<string, { name: string; rows: PerformanceTestRow[] }>();
  for (const t of tests) {
    const entry = byStudent.get(t.student_id) ?? { name: t.student_name, rows: [] };
    entry.rows.push(t);
    byStudent.set(t.student_id, entry);
  }

  const metricGroups = new Map<string, MetricSummary[]>();
  const progress: StudentProgress[] = [];

  byStudent.forEach((entry, student_id) => {
    const analysis = analyzeStudentTests(entry.rows);
    const changes: number[] = [];
    for (const m of analysis.metrics) {
      const list = metricGroups.get(m.key) ?? [];
      list.push(m);
      metricGroups.set(m.key, list);
      if (m.changePct !== null) changes.push(m.changePct);
    }
    if (changes.length > 0) progress.push({ student_id, name: entry.name, avgChangePct: round1(avg(changes)), metrics: changes.length });
  });

  const byMetric: MetricAggregate[] = [];
  metricGroups.forEach((list, key) => {
    const first = list[0];
    const changes = list.filter((m) => m.changePct !== null).map((m) => m.changePct as number);
    byMetric.push({
      key,
      name: first.name,
      category: first.category,
      unit: first.unit,
      direction: first.direction,
      students: list.length,
      tests: list.reduce((s, m) => s + m.count, 0),
      avgLatest: round1(avg(list.map((m) => m.latest))),
      avgChangePct: changes.length ? round1(avg(changes)) : null,
      improving: list.filter((m) => m.trend === "improving").length,
      declining: list.filter((m) => m.trend === "declining").length,
      stable: list.filter((m) => m.trend === "stable").length,
    });
  });
  byMetric.sort((a, b) => b.students - a.students || a.name.localeCompare(b.name, "tr"));

  const catMap = new Map<string, { changes: number[]; students: number }>();
  metricGroups.forEach((list) => {
    const category = list[0].category;
    const c = catMap.get(category) ?? { changes: [], students: 0 };
    c.students += list.length;
    for (const m of list) if (m.changePct !== null) c.changes.push(m.changePct);
    catMap.set(category, c);
  });
  const byCategory = Array.from(catMap.entries())
    .map(([category, c]) => ({ category, students: c.students, avgChangePct: c.changes.length ? round1(avg(c.changes)) : null }))
    .sort((a, b) => b.students - a.students);

  return {
    totalTests: tests.length,
    testedStudents: byStudent.size,
    byMetric,
    byCategory,
    mostImproved: progress.filter((p) => p.avgChangePct > 0).sort((a, b) => b.avgChangePct - a.avgChangePct).slice(0, 5),
    mostDeclined: progress.filter((p) => p.avgChangePct < 0).sort((a, b) => a.avgChangePct - b.avgChangePct).slice(0, 5),
  };
}
