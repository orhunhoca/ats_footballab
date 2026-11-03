import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { studentService } from "@/services/studentService";
import { useBranch } from "@/contexts/BranchContext";
import { Loader2, TrendingUp, Users, DollarSign, Wallet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2 } from "lucide-react";

interface FinancialStats {
  totalRevenue: number;
  newRegistrationRevenue: number;
  renewalRevenue: number;
  clothingRevenue: number;
  newRegistrationsCount: number;
  renewalsCount: number;
}

function ReportsPageInner() {
  const { isManagement: isAdmin, loading: roleLoading } = useUserRole();
  const { selectedBranchId, branches, getBranchName } = useBranch();
  const [byBranch, setByBranch] = useState<{
    weekly: Record<string, FinancialStats>;
    monthly: Record<string, FinancialStats>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<{
    weekly: FinancialStats;
    monthly: FinancialStats;
  }>({
    weekly: { totalRevenue: 0, newRegistrationRevenue: 0, renewalRevenue: 0, clothingRevenue: 0, newRegistrationsCount: 0, renewalsCount: 0 },
    monthly: { totalRevenue: 0, newRegistrationRevenue: 0, renewalRevenue: 0, clothingRevenue: 0, newRegistrationsCount: 0, renewalsCount: 0 }
  });

  useEffect(() => {
    if (isAdmin) {
      loadFinancials();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedBranchId, branches.length]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const [weekly, monthly] = await Promise.all([
        studentService.getFinancialReport("weekly", selectedBranchId),
        studentService.getFinancialReport("monthly", selectedBranchId)
      ]);
      setFinancials({ weekly, monthly });

      // Tüm şubeler seçiliyken şube bazında karşılaştırma
      if (!selectedBranchId && branches.length > 1) {
        const [w, m] = await Promise.all([
          studentService.getFinancialReportByBranch("weekly"),
          studentService.getFinancialReportByBranch("monthly")
        ]);
        setByBranch({ weekly: w, monthly: m });
      } else {
        setByBranch(null);
      }
    } catch (error) {
      console.error("Error loading financials:", error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <>
      <SEO title="Raporlar - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Raporlar & İstatistikler</h1>
            <p className="text-gray-600 mt-1">Mali durum, katılım oranları ve performans analizleri</p>
          </div>

          <BranchFilterBar />

          <Tabs defaultValue={isAdmin ? "financial" : "attendance"} className="space-y-6">
            <TabsList>
              {isAdmin && <TabsTrigger value="financial">Mali Raporlar</TabsTrigger>}
              <TabsTrigger value="attendance">Katılım Raporları</TabsTrigger>
              <TabsTrigger value="performance">Performans</TabsTrigger>
            </TabsList>

            {isAdmin && (
              <TabsContent value="financial" className="space-y-6">
                {loading ? (
                  <Card className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle>Yönetim Yetkisi</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Bu raporları yalnızca yönetim yetkisine sahip kullanıcılar (admin ve yöneticiler) görebilir.
                      </AlertDescription>
                    </Alert>

                    {/* Kapsam: seçili şube */}
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Kapsam: <strong>{selectedBranchId ? getBranchName(selectedBranchId) : "Tüm Şubeler"}</strong>
                    </p>

                    {/* Şube bazında karşılaştırma */}
                    {byBranch && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            Şube Bazında Ciro
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-600 border-b">
                                <th className="py-2 pr-4 font-medium">Şube</th>
                                <th className="py-2 pr-4 font-medium text-right">Son 7 Gün</th>
                                <th className="py-2 pr-4 font-medium text-right">Son 30 Gün</th>
                                <th className="py-2 pr-4 font-medium text-right">Yeni Kayıt (30g)</th>
                                <th className="py-2 pr-4 font-medium text-right">Yenileme (30g)</th>
                                <th className="py-2 font-medium text-right">Kıyafet (30g)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...branches.map((b) => b.id), ...(byBranch.monthly.none || byBranch.weekly.none ? ["none"] : [])].map((id) => {
                                const w = byBranch.weekly[id];
                                const m = byBranch.monthly[id];
                                return (
                                  <tr key={id} className="border-b last:border-0">
                                    <td className="py-2 pr-4 font-medium">{id === "none" ? "Şubesiz" : getBranchName(id)}</td>
                                    <td className="py-2 pr-4 text-right">{formatCurrency(w?.totalRevenue || 0)}</td>
                                    <td className="py-2 pr-4 text-right">{formatCurrency(m?.totalRevenue || 0)}</td>
                                    <td className="py-2 pr-4 text-right">{formatCurrency(m?.newRegistrationRevenue || 0)}</td>
                                    <td className="py-2 pr-4 text-right">{formatCurrency(m?.renewalRevenue || 0)}</td>
                                    <td className="py-2 text-right">{formatCurrency(m?.clothingRevenue || 0)}</td>
                                  </tr>
                                );
                              })}
                              <tr className="font-semibold">
                                <td className="py-2 pr-4">Toplam</td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(financials.weekly.totalRevenue)}</td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(financials.monthly.totalRevenue)}</td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(financials.monthly.newRegistrationRevenue)}</td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(financials.monthly.renewalRevenue)}</td>
                                <td className="py-2 text-right">{formatCurrency(financials.monthly.clothingRevenue)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Weekly Report */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          Haftalık Mali Rapor (Son 7 Gün)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-4 gap-6">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Toplam Ciro</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(financials.weekly.totalRevenue)}</p>
                          </div>
                          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-sm text-emerald-700 mb-1">Yeni Kayıt ({financials.weekly.newRegistrationsCount})</p>
                            <p className="text-xl font-bold text-emerald-700">{formatCurrency(financials.weekly.newRegistrationRevenue)}</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-700 mb-1">Yenileme ({financials.weekly.renewalsCount})</p>
                            <p className="text-xl font-bold text-blue-700">{formatCurrency(financials.weekly.renewalRevenue)}</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="text-sm text-purple-700 mb-1">Kıyafet Geliri</p>
                            <p className="text-xl font-bold text-purple-700">{formatCurrency(financials.weekly.clothingRevenue)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Monthly Report */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-blue-600" />
                          Aylık Mali Rapor (Son 30 Gün)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-4 gap-6">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Toplam Ciro</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(financials.monthly.totalRevenue)}</p>
                          </div>
                          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-sm text-emerald-700 mb-1">Yeni Kayıt ({financials.monthly.newRegistrationsCount})</p>
                            <p className="text-xl font-bold text-emerald-700">{formatCurrency(financials.monthly.newRegistrationRevenue)}</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-700 mb-1">Yenileme ({financials.monthly.renewalsCount})</p>
                            <p className="text-xl font-bold text-blue-700">{formatCurrency(financials.monthly.renewalRevenue)}</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="text-sm text-purple-700 mb-1">Kıyafet Geliri</p>
                            <p className="text-xl font-bold text-purple-700">{formatCurrency(financials.monthly.clothingRevenue)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle>Katılım İstatistikleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Users className="w-16 h-16 mb-4 opacity-20" />
                    <p>Detaylı katılım raporları yakında eklenecek.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="performance">
               <Card>
                <CardHeader>
                  <CardTitle>Performans Analizi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
                    <p>Performans metrikleri yakında eklenecek.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <RoleGate level="staff">
      <ReportsPageInner />
    </RoleGate>
  );
}
