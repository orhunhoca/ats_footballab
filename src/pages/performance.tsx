import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  MessageCircle,
  Video,
  Loader2,
  Search,
  Users,
  Target,
  Calendar,
  Award,
  Minus,
  FileDown,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { studentService, type Student } from "@/services/studentService";
import {
  performanceService,
  type PerformanceTest,
} from "@/services/performanceService";
import { settingsService, type TestProtocol } from "@/services/settingsService";
import { groupService } from "@/services/groupService";
import { performanceReportService } from "@/services/performanceReportService";
import { PerformanceTestForm } from "@/components/students/PerformanceTestForm";
import { SendPerformanceReportDialog } from "@/components/students/SendPerformanceReportDialog";
import { MarkdownLite } from "@/components/MarkdownLite";
import { CameraMeasureDialog } from "@/components/performance/CameraMeasureDialog";
import { NormComparisonCard } from "@/components/performance/NormComparisonCard";
import { useStudentAnalysis } from "@/hooks/useStudentAnalysis";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;

function PerformancePageInner() {
  const { toast } = useToast();
  const { selectedBranchId, getBranchName } = useBranch();
  const { isManagement } = useUserRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [testProtocols, setTestProtocols] = useState<TestProtocol[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [selectedProtocolFilter, setSelectedProtocolFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiParentSummary, setAiParentSummary] = useState<string>("");
  const [aiNotice, setAiNotice] = useState<string>("");
  const [aiSource, setAiSource] = useState<"ai" | "rule" | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [performanceStats, setPerformanceStats] = useState<{
    totalTests: number;
    improvementRate: number;
    averageScore: number;
    lastTestDate: string | null;
  } | null>(null);

  useEffect(() => {
    loadTestProtocols();
  }, []);

  // Şube değişince öğrenci/grup listesini yenile; önceki şubenin öğrencisi seçili kalmasın
  useEffect(() => {
    setSelectedStudent(null);
    setSelectedGroup("all");
    loadStudents();
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  useEffect(() => {
    // Önceki öğrencinin analizi yeni öğrenciye (veya WhatsApp özetine) sızmasın
    resetAnalysis();
    if (selectedStudent) {
      loadTests();
      loadPerformanceStats();
    }
  }, [selectedStudent]);

  const resetAnalysis = () => {
    setAiAnalysis("");
    setAiParentSummary("");
    setAiNotice("");
    setAiSource(null);
  };

  const loadStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const data = await studentService.getAllStudents(selectedBranchId);
      console.log("📚 Loaded students:", data.length);
      setStudents(data);
    } catch (error) {
      console.error("❌ Error loading students:", error);
      toast({
        title: "Hata",
        description: "Öğrenciler yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await groupService.getAllGroups(selectedBranchId);
      setGroups(data);
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const loadTestProtocols = async () => {
    try {
      const protocols = await settingsService.getTestProtocols();
      console.log("📋 Loaded test protocols:", protocols);
      setTestProtocols(protocols);
    } catch (error) {
      console.error("Error loading test protocols:", error);
      toast({
        title: "Hata",
        description: "Test protokolleri yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const loadTests = async () => {
    if (!selectedStudent) return;

    setIsLoadingTests(true);
    try {
      const data = await performanceService.getStudentTests(selectedStudent.id);
      setTests(data);
    } catch (error) {
      console.error("Error loading tests:", error);
      toast({
        title: "Hata",
        description: "Test verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTests(false);
    }
  };

  const loadPerformanceStats = async () => {
    if (!selectedStudent) return;

    try {
      const stats = await performanceService.getPerformanceStats(selectedStudent.id);
      setPerformanceStats(stats);
    } catch (error) {
      console.error("Error loading performance stats:", error);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedStudent) return;

    setIsGeneratingAI(true);
    try {
      const result = await performanceService.analyzeStudent(selectedStudent, tests);
      setAiAnalysis(result.analysis);
      setAiParentSummary(result.parentSummary);
      setAiNotice(result.notice || "");
      setAiSource(result.source);
      toast({
        title: result.source === "ai" ? "AI Analizi Tamamlandı" : "Analiz Hazır",
        description: result.notice || "Performans analizi başarıyla oluşturuldu.",
      });
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      toast({
        title: "Hata",
        description: "AI analizi oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedStudent) return;

    try {
      // Yapay zekâ analizi yapıldıysa o, yoksa kayıtlı verilerden kural tabanlı rapor kullanılır
      const report = await performanceReportService.build({
        student: selectedStudent,
        tests,
        analysisMarkdown: aiAnalysis || undefined,
        parentSummary: aiParentSummary || undefined,
        aiGenerated: aiSource === "ai" && !!aiAnalysis,
        branchName: selectedStudent.branch_id ? getBranchName(selectedStudent.branch_id) : null,
      });
      performanceReportService.download(report);

      toast({
        title: "PDF İndirildi",
        description: "Performans raporu başarıyla oluşturuldu.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Hata",
        description: "PDF oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedGroup === "all") return matchesSearch;
    
    // Filter by group
    const studentGroups = (student as any).student_groups || [];
    return matchesSearch && studentGroups.some((sg: any) => sg.group_id === selectedGroup);
  });

  const studentAnalysis = useStudentAnalysis(selectedStudent?.age, tests);

  const filteredTests =
    selectedProtocolFilter === "all"
      ? tests
      : tests.filter((test) => test.test_protocol_id === selectedProtocolFilter);

  // Prepare chart data
  const getChartData = () => {
    if (!selectedStudent || tests.length === 0) return [];

    // Group tests by protocol name
    const testsByProtocol: Record<string, PerformanceTest[]> = {};
    tests.forEach((test) => {
      const protocolName = test.test_protocols?.name || test.test_type || "Bilinmeyen Test";
      if (!testsByProtocol[protocolName]) {
        testsByProtocol[protocolName] = [];
      }
      testsByProtocol[protocolName].push(test);
    });

    // Get all unique dates
    const dates = [...new Set(tests.map((t) => t.test_date))].sort();

    return dates.map((date) => {
      const dataPoint: any = { date: format(new Date(date), "dd MMM", { locale: tr }) };
      Object.keys(testsByProtocol).forEach((protocolName) => {
        const testOnDate = testsByProtocol[protocolName].find((t) => t.test_date === date);
        if (testOnDate) {
          dataPoint[protocolName] = Number(testOnDate.value);
        }
      });
      return dataPoint;
    });
  };

  const chartData = getChartData();
  const chartLines = Object.keys(chartData[0] || {}).filter(key => key !== 'date');

  // Prepare bar chart data (latest test per protocol)
  const getBarChartData = () => {
    if (!selectedStudent || tests.length === 0) return [];

    const latestByProtocol: Record<string, PerformanceTest> = {};
    tests.forEach((test) => {
      const protocolName = test.test_protocols?.name || test.test_type || "Bilinmeyen";
      const existing = latestByProtocol[protocolName];
      if (!existing || new Date(test.test_date) > new Date(existing.test_date)) {
        latestByProtocol[protocolName] = test;
      }
    });

    return Object.entries(latestByProtocol).map(([name, test]) => ({
      name,
      value: Number(test.value),
      unit: test.test_protocols?.unit || test.unit || "",
    }));
  };

  const barChartData = getBarChartData();

  // Calculate improvement
  const getImprovement = (protocolId: string | null, testType: string | null) => {
    const typeTests = tests
      .filter((t) => (protocolId && t.test_protocol_id === protocolId) || (!protocolId && t.test_type === testType))
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

    if (typeTests.length < 2) return null;

    const first = Number(typeTests[0].value);
    const last = Number(typeTests[typeTests.length - 1].value);
    const diff = last - first;

    const unit = typeTests[0].test_protocols?.unit || typeTests[0].unit || "";
    const isTimeBased = unit.toLowerCase().includes("saniye") || unit.toLowerCase().includes("sn");
    
    const isImprovement = isTimeBased ? diff < 0 : diff > 0;

    return {
      value: Math.abs(diff),
      isImprovement: isImprovement,
      percentage: first !== 0 ? ((Math.abs(diff) / first) * 100).toFixed(1) : "0",
    };
  };

  const getTrendIcon = (improvementRate: number) => {
    if (improvementRate > 5) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (improvementRate < -5) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  return (
    <>
      <SEO
        title="Performans Testleri - FootbalLab"
        description="Öğrenci performans takibi ve AI destekli analiz"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Navigation />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Performans Analiz Paneli
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Detaylı performans takibi, trend analizi ve AI destekli öneriler
            </p>
          </div>

          <BranchFilterBar />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Selection */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Öğrenci Seç
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Öğrenci ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grup filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Tüm Gruplar
                      </div>
                    </SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {isLoadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {searchQuery || selectedGroup !== "all" ? "Öğrenci bulunamadı" : "Henüz kayıtlı öğrenci yok"}
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <Button
                        key={student.id}
                        variant={
                          selectedStudent?.id === student.id ? "default" : "outline"
                        }
                        className="w-full justify-start"
                        onClick={() => setSelectedStudent(student)}
                      >
                        {student.name}
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStudent ? (
                <>
                  {/* Student Info & Actions */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl">
                            {selectedStudent.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {tests.length} test kaydı
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={handleGenerateAI}
                            disabled={isGeneratingAI || tests.length === 0}
                            variant="outline"
                          >
                            {isGeneratingAI ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analiz Ediliyor...
                              </>
                            ) : (
                              <>
                                <Brain className="mr-2 h-4 w-4" />
                                AI Analizi
                              </>
                            )}
                          </Button>
                          <Button 
                            onClick={handleExportPDF}
                            disabled={tests.length === 0}
                            variant="outline"
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            PDF İndir
                          </Button>
                          {isManagement && <Button
                            onClick={() => setIsWhatsAppOpen(true)}
                            disabled={tests.length === 0}
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Veliye Gönder
                          </Button>}
                          <Button variant="outline" onClick={() => setIsCameraOpen(true)} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                            <Video className="mr-2 h-4 w-4" />
                            Kamerayla Ölç
                          </Button>
                          <Button onClick={() => setIsFormOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Test Ekle
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Performance Stats Cards */}
                  {performanceStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Toplam Test
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {performanceStats.totalTests}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            {getTrendIcon(performanceStats.improvementRate)}
                            Gelişim Oranı
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-3xl font-bold ${
                            performanceStats.improvementRate > 0 ? "text-green-600" : 
                            performanceStats.improvementRate < 0 ? "text-red-600" : 
                            "text-gray-600"
                          }`}>
                            {performanceStats.improvementRate > 0 ? "+" : ""}
                            {performanceStats.improvementRate}%
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            Ortalama Skor
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {performanceStats.averageScore}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Son Test
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold">
                            {performanceStats.lastTestDate 
                              ? format(new Date(performanceStats.lastTestDate), "dd MMM", { locale: tr })
                              : "-"
                            }
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {aiAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-500" />
                          {aiSource === "ai" ? "AI Destekli Gelişim Analizi" : "Gelişim Analizi"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {aiNotice && (
                          <p className="mb-3 rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                            {aiNotice}
                          </p>
                        )}
                        <MarkdownLite text={aiAnalysis} />
                        {aiParentSummary && (
                          <div className="mt-4 rounded-md border bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Veli özeti</p>
                            <p className="text-sm">{aiParentSummary}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <NormComparisonCard analysis={studentAnalysis} age={selectedStudent?.age} />

                  {/* Performance Charts */}
                  {chartData.length > 0 && (
                    <div className="grid grid-cols-1 gap-6">
                      {/* Line Chart - Progress Over Time */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Gelişim Grafiği (Zaman İçinde)
                          </CardTitle>
                          <CardDescription>
                            Test performansınızın zamana göre değişimi
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              {chartLines.map((line, index) => {
                                const colors = [
                                  "#3b82f6",
                                  "#10b981",
                                  "#f59e0b",
                                  "#ef4444",
                                  "#8b5cf6",
                                  "#06b6d4",
                                ];
                                return (
                                  <Line
                                    key={line}
                                    type="monotone"
                                    dataKey={line}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Bar Chart - Latest Performance */}
                      {barChartData.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              Güncel Performans Karşılaştırması
                            </CardTitle>
                            <CardDescription>
                              Her test kategorisindeki en son performans
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3b82f6" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Test Results */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Test Sonuçları</CardTitle>
                        <Select
                          value={selectedProtocolFilter}
                          onValueChange={setSelectedProtocolFilter}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Test türü" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Testler</SelectItem>
                            {testProtocols.map((protocol) => (
                              <SelectItem key={protocol.id} value={protocol.id}>
                                {protocol.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingTests ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : filteredTests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Henüz test kaydı bulunmamaktadır.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tarih</TableHead>
                              <TableHead>Test Türü</TableHead>
                              <TableHead>Sonuç</TableHead>
                              <TableHead>Gelişim</TableHead>
                              <TableHead>Notlar</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTests.map((test) => {
                              const improvement = getImprovement(test.test_protocol_id || null, test.test_type || null);
                              const protocolName = test.test_protocols?.name || test.test_type || "Bilinmeyen";
                              const unit = test.test_protocols?.unit || test.unit || "";
                              
                              return (
                                <TableRow key={test.id}>
                                  <TableCell>
                                    {format(new Date(test.test_date), "dd MMM yyyy", {
                                      locale: tr,
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    {protocolName}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {test.value} {unit}
                                  </TableCell>
                                  <TableCell>
                                    {improvement && (
                                      <Badge
                                        variant={
                                          improvement.isImprovement
                                            ? "default"
                                            : "destructive"
                                        }
                                        className={improvement.isImprovement ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300" : ""}
                                      >
                                        {improvement.isImprovement ? (
                                          <TrendingUp className="mr-1 h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="mr-1 h-3 w-3" />
                                        )}
                                        {improvement.percentage}%
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {test.notes || "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Detayları görüntülemek için soldaki listeden bir öğrenci seçin</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Form Dialog */}
      {selectedStudent && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <PerformanceTestForm
              student={selectedStudent}
              testProtocols={testProtocols}
              onSuccess={() => {
                loadTests();
                loadPerformanceStats();
                resetAnalysis();
                setIsFormOpen(false);
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedStudent && (
        <CameraMeasureDialog
          open={isCameraOpen}
          onOpenChange={setIsCameraOpen}
          student={selectedStudent}
          testProtocols={testProtocols}
          onSaved={() => {
            loadTests();
            loadPerformanceStats();
            resetAnalysis();
          }}
        />
      )}

      {selectedStudent && (
        <SendPerformanceReportDialog
          open={isWhatsAppOpen}
          onOpenChange={setIsWhatsAppOpen}
          student={selectedStudent}
          tests={tests}
          suggestedEvaluation={aiParentSummary || undefined}
          analysisMarkdown={aiAnalysis || undefined}
          aiGenerated={aiSource === "ai" && !!aiAnalysis}
        />
      )}
    </>
  );
}

export default function PerformancePage() {
  return (
    <RoleGate level="staff">
      <PerformancePageInner />
    </RoleGate>
  );
}
