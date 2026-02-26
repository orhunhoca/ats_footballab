import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { studentService, type Student } from "@/services/studentService";
import {
  performanceService,
  type PerformanceTest,
} from "@/services/performanceService";
import { settingsService, type TestProtocol } from "@/services/settingsService";
import { PerformanceTestForm } from "@/components/students/PerformanceTestForm";
import { useToast } from "@/hooks/use-toast";

export default function PerformancePage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [testProtocols, setTestProtocols] = useState<TestProtocol[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [selectedProtocolFilter, setSelectedProtocolFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  useEffect(() => {
    loadStudents();
    loadTestProtocols();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadTests();
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const data = await studentService.getAllStudents();
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

  const handleGenerateAI = async () => {
    if (!selectedStudent) return;

    setIsGeneratingAI(true);
    try {
      const analysis = await performanceService.generateAIAnalysis(
        selectedStudent.id,
        selectedStudent.name
      );
      setAiAnalysis(analysis);
      toast({
        title: "AI Analizi Tamamlandı",
        description: "Performans analizi başarıyla oluşturuldu.",
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

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Calculate improvement
  const getImprovement = (protocolId: string | null, testType: string | null) => {
    const typeTests = tests
      .filter((t) => (protocolId && t.test_protocol_id === protocolId) || (!protocolId && t.test_type === testType))
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

    if (typeTests.length < 2) return null;

    const first = Number(typeTests[0].value);
    const last = Number(typeTests[typeTests.length - 1].value);
    const diff = last - first;

    // For simplicity, assuming higher is better unless unit suggests otherwise (like seconds)
    // We can refine this logic based on protocol configuration later
    const unit = typeTests[0].test_protocols?.unit || typeTests[0].unit || "";
    const isTimeBased = unit.toLowerCase().includes("saniye") || unit.toLowerCase().includes("sn");
    
    // If time based, lower is better (diff < 0 is improvement)
    // If not time based (reps, cm, m), higher is better (diff > 0 is improvement)
    const isImprovement = isTimeBased ? diff < 0 : diff > 0;

    return {
      value: Math.abs(diff),
      isImprovement: isImprovement,
      percentage: first !== 0 ? ((Math.abs(diff) / first) * 100).toFixed(1) : "0",
    };
  };

  return (
    <>
      <SEO
        title="Performans Testleri - Sportex"
        description="Öğrenci performans takibi ve AI destekli analiz"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Performans Testleri
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Öğrenci gelişimini takip edin ve AI destekli analizler oluşturun
            </p>
          </div>

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
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {isLoadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {searchQuery ? "Öğrenci bulunamadı" : "Henüz kayıtlı öğrenci yok"}
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
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl">
                            {selectedStudent.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {tests.length} test kaydı
                          </p>
                        </div>
                        <div className="flex gap-2">
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
                          <Button onClick={() => setIsFormOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Test Ekle
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* AI Analysis */}
                  {aiAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-500" />
                          AI Destekli Gelişim Analizi
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose dark:prose-invert max-w-none">
                          <div className="whitespace-pre-wrap text-sm">
                            {aiAnalysis}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Performance Charts */}
                  {chartData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Gelişim Grafiği
                        </CardTitle>
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
                setIsFormOpen(false);
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}