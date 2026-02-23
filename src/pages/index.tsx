import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import { Users, ClipboardCheck, BarChart3, UserPlus, Calendar, TrendingUp, Grid3x3, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
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
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/students">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Hemen Başla
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                Demo İzle
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-20">
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">60</div>
              <div className="text-sm text-gray-600">Aktif Öğrenci</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">4</div>
              <div className="text-sm text-gray-600">Antrenör</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">94%</div>
              <div className="text-sm text-gray-600">Devam Oranı</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">4</div>
              <div className="text-sm text-gray-600">Aktif Grup</div>
            </div>
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

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-emerald-600 to-green-700 py-20">
          <div className="container mx-auto px-4 text-center">
            <Calendar className="w-16 h-16 text-white mx-auto mb-6 opacity-90" />
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Futbol Okulunuzu Bir Üst Seviyeye Taşıyın
            </h3>
            <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
              Modern teknoloji ile idari süreçlerinizi hızlandırın, daha fazla zamanı sahada geçirin.
            </p>
            <Link href="/students">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 text-lg px-10 py-6">
                Ücretsiz Deneyin
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm">© {new Date().getFullYear()} Futbol Okulu Yönetim Sistemi. Tüm hakları saklıdır.</p>
          </div>
        </footer>
      </div>
    </>
  );
}