import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { studentService } from "@/services/studentService";
import { Loader2, TrendingUp, Users, DollarSign, Wallet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FinancialStats {
  totalRevenue: number;
  newRegistrationRevenue: number;
  renewalRevenue: number;
  clothingRevenue: number;
  newRegistrationsCount: number;
  renewalsCount: number;
}

export default function ReportsPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
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
  }, [isAdmin]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const [weekly, monthly] = await Promise.all([
        studentService.getFinancialReport("weekly"),
        studentService.getFinancialReport("monthly")
      ]);
      setFinancials({ weekly, monthly });
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
                      <AlertTitle>Admin Yetkisi</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Bu raporları sadece yönetici yetkisine sahip kullanıcılar görebilir.
                      </AlertDescription>
                    </Alert>

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