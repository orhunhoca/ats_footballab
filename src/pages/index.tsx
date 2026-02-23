import { SEO } from "@/components/SEO";
import Link from "next/link";
import { Users, ClipboardCheck, BarChart3, UserPlus, Calendar, TrendingUp } from "lucide-react";
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
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 2 L12 22 M2 12 L22 12 M6 6 L18 18 M6 18 L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Futbol Okulu</h1>
                  <p className="text-sm text-gray-600">Yönetim Sistemi</p>
                </div>
              </div>
              
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                  Ana Sayfa
                </Link>
                <Link href="/students" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                  Öğrenciler
                </Link>
                <Link href="/attendance" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                  Yoklama
                </Link>
                <Link href="/reports" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                  Raporlar
                </Link>
              </nav>
              
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Giriş Yap
              </Button>
            </div>
          </div>
        </header>

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
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6">
                <UserPlus className="w-5 h-5 mr-2" />
                Hemen Başla
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                Demo İzle
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-20">
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">250+</div>
              <div className="text-sm text-gray-600">Aktif Öğrenci</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">15</div>
              <div className="text-sm text-gray-600">Antrenör</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">98%</div>
              <div className="text-sm text-gray-600">Devam Oranı</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-emerald-600 mb-1">12</div>
              <div className="text-sm text-gray-600">Aktif Grup</div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Öğrenci Yönetimi</CardTitle>
                <CardDescription className="text-base">
                  Öğrenci kayıtları, profiller, veli bilgileri ve grup atamaları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2" />
                    <span>Hızlı kayıt ve düzenleme</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2" />
                    <span>Detaylı öğrenci profilleri</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2" />
                    <span>Grup ve takım organizasyonu</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-7 h-7 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Yoklama Sistemi</CardTitle>
                <CardDescription className="text-base">
                  Günlük devam takibi, otomatik bildirimler ve devamsızlık raporları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                    <span>Tek tıkla yoklama alma</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                    <span>Devamsızlık bildirimleri</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                    <span>Geçmiş kayıtları görüntüleme</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-7 h-7 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Raporlar & Analiz</CardTitle>
                <CardDescription className="text-base">
                  Performans takibi, istatistikler ve gelişim raporları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2" />
                    <span>Devam istatistikleri</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2" />
                    <span>Performans grafikleri</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2" />
                    <span>Özelleştirilebilir raporlar</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
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
            <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 text-lg px-10 py-6">
              Ücretsiz Deneyin
            </Button>
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