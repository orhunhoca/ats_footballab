import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import { Users, ClipboardCheck, BarChart3, UserPlus, Calendar, TrendingUp, Grid3x3, Bell, UserCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { studentService } from "@/services/studentService";

export default function Home() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalGroups: 6
  });
  const [notifications, setNotifications] = useState({
    expired: 0,
    expiring: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const studentStats = await studentService.getStudentStats();
      setStats({
        totalStudents: studentStats.total,
        activeStudents: studentStats.active,
        totalGroups: 6
      });

      // Bildirim sayılarını hesapla
      const students = await studentService.getAllStudents();
      const today = new Date();
      let expired = 0;
      let expiring = 0;

      students.forEach(student => {
        if (!student.membership_end_date) return;
        const endDate = new Date(student.membership_end_date);
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) expired++;
        else if (diffDays <= 14) expiring++;
      });

      setNotifications({
        expired,
        expiring,
        total: expired + expiring
      });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Futbol Okulu Yönetim Sistemi"
        description="Öğrenci kayıt, yoklama ve performans takibi için profesyonel futbol okulu yönetim platformu"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <Navigation />

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <TrendingUp className="w-4 h-4" />
              Modern Futbol Okulu Yönetimi
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Futbol Okulunuzu
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-700"> Dijitalleştirin</span>
            </h2>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Öğrenci kayıt, yoklama takibi ve performans analizini tek platformda yönetin. 
              Zamanınızı idari işlerle değil, antrenmanla geçirin.
            </p>
          </div>

          {/* Stats Cards - add notification card */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Öğrenci</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Kayıtlı öğrenci sayısı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Öğrenci</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeStudents}</div>
                <p className="text-xs text-muted-foreground">Aktif üyelikler</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gruplar</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGroups}</div>
                <p className="text-xs text-muted-foreground">Aktif grup sayısı</p>
              </CardContent>
            </Card>

            <Link href="/notifications">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Bekleyen Bildirimler</CardTitle>
                  <Bell className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">{notifications.total}</div>
                  <p className="text-xs text-orange-600">
                    {notifications.expired > 0 && `${notifications.expired} üyelik bitti • `}
                    {notifications.expiring > 0 && `${notifications.expiring} yaklaşan`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <Link href="/students">
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl">Öğrenci Yönetimi</CardTitle>
                  <CardDescription>
                    Kayıtlar, profiller ve grup atamaları
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/attendance">
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader>
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                    <ClipboardCheck className="w-7 h-7 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Yoklama Sistemi</CardTitle>
                  <CardDescription>
                    Günlük devam takibi ve bildirimler
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/groups">
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader>
                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                    <Grid3x3 className="w-7 h-7 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Grup Yönetimi</CardTitle>
                  <CardDescription>
                    Takımlar, program ve organizasyon
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/reports">
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader>
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                    <BarChart3 className="w-7 h-7 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl">Raporlar & Analiz</CardTitle>
                  <CardDescription>
                    İstatistikler ve performans takibi
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm">© {new Date().getFullYear()} Sportex Futbol Okulu. Tüm hakları saklıdır.</p>
          </div>
        </footer>
      </div>
    </>
  );
}