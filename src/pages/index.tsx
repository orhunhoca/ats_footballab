import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, TrendingUp, ShieldCheck, UserCircle2, ArrowRight, Bell, Trophy } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { userService } from "@/services/userService";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!userService.getCurrentUser());
  }, []);

  return (
    <>
      <SEO title="Sportex - Futbol Okulu Yönetim Sistemi" />
      
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <Navigation />

        {/* Hero Section */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden relative">
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <TrendingUp className="w-4 h-4" />
              Profesyonel Altyapı Yönetimi
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
              Geleceğin Yıldızlarını
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500 mt-2">
                Sportex ile Yetiştirin
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Öğrenci takibi, antrenman programları, aidat yönetimi ve performans analizleri tek bir platformda.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isLoggedIn ? (
                <Link href="/students">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all">
                    <Users className="w-5 h-5 mr-2" />
                    Öğrenci Paneline Git
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all">
                    <UserCircle2 className="w-5 h-5 mr-2" />
                    Giriş Yap
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Cards */}
        <section className="py-12 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">Öğrenci Yönetimi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Detaylı profil kartları, sağlık raporları ve veli iletişim bilgileri.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                    <CalendarCheck className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-purple-900 dark:text-purple-100">Yoklama Sistemi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    QR kod veya liste üzerinden hızlı yoklama ve devamsızlık takibi.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">Performans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Gelişim raporları, maç istatistikleri ve antrenör değerlendirmeleri.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Güvenli Altyapı</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                    KVKK uyumlu veri saklama, rol tabanlı yetkilendirme ve yedekleme.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Simple Footer */}
        <footer className="bg-white dark:bg-slate-950 py-8 border-t border-slate-200 dark:border-slate-800 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">Sportex</span>
            </div>
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Sportex Futbol Okulu Yönetim Sistemi. Tüm hakları saklıdır.</p>
          </div>
        </footer>
      </div>
    </>
  );
}