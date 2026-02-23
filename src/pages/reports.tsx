import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Users, Calendar, Download, BarChart3 } from "lucide-react";

export default function ReportsPage() {
  // Mock data
  const monthlyStats = [
    { month: "Ocak", attendance: 92, students: 48 },
    { month: "Şubat", attendance: 95, students: 52 },
    { month: "Mart", attendance: 88, students: 54 },
    { month: "Nisan", attendance: 91, students: 56 },
    { month: "Mayıs", attendance: 94, students: 58 },
    { month: "Haziran", attendance: 96, students: 60 },
  ];

  const topStudents = [
    { name: "Ahmet Yılmaz", group: "U13", attendance: 100, performance: 95 },
    { name: "Mehmet Demir", group: "U12", attendance: 98, performance: 92 },
    { name: "Can Öztürk", group: "U14", attendance: 96, performance: 94 },
    { name: "Ege Kaya", group: "U11", attendance: 100, performance: 90 },
    { name: "Eren Aydın", group: "U14", attendance: 95, performance: 93 },
  ];

  const groupStats = [
    { name: "U13 - Yeşil Takım", students: 15, attendance: 94, avgPerformance: 88 },
    { name: "U12 - Mavi Takım", students: 18, attendance: 96, avgPerformance: 85 },
    { name: "U14 - Kırmızı Takım", students: 14, attendance: 91, avgPerformance: 92 },
    { name: "U11 - Sarı Takım", students: 13, attendance: 98, avgPerformance: 87 },
  ];

  return (
    <>
      <SEO title="Raporlar ve İstatistikler - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Raporlar & İstatistikler</h1>
              <p className="text-gray-600 mt-1">Detaylı performans ve devam analizleri</p>
            </div>
            <div className="flex gap-3">
              <Select defaultValue="thisMonth">
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisWeek">Bu Hafta</SelectItem>
                  <SelectItem value="thisMonth">Bu Ay</SelectItem>
                  <SelectItem value="lastMonth">Geçen Ay</SelectItem>
                  <SelectItem value="thisYear">Bu Yıl</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Rapor İndir
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-700">Ortalama Devam</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-bold text-emerald-600">94%</div>
                  <div className="flex items-center text-emerald-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +3%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">Toplam Öğrenci</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-bold text-blue-600">60</div>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700">Aktif Grup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-bold text-purple-600">4</div>
                  <div className="flex items-center text-gray-500 text-sm font-medium">
                    Sabit
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-700">Ortalama Performans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-bold text-amber-600">89%</div>
                  <div className="flex items-center text-amber-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +2%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Monthly Attendance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  Aylık Devam Oranı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.map((stat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{stat.month}</span>
                        <span className="text-emerald-600 font-semibold">{stat.attendance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-green-600 h-2.5 rounded-full transition-all"
                          style={{ width: `${stat.attendance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  En İyi Performans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topStudents.map((student, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-600">{student.group}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-600">
                          {student.attendance}% Devam
                        </div>
                        <div className="text-xs text-gray-600">
                          {student.performance}% Performans
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Group Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Grup Bazlı İstatistikler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Grup Adı</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Öğrenci Sayısı</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Devam Oranı</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ort. Performans</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map((group, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 font-medium text-gray-900">{group.name}</td>
                        <td className="py-4 px-4 text-center text-gray-700">{group.students}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                            {group.attendance}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {group.avgPerformance}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button variant="outline" size="sm">
                            Detay Gör
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}