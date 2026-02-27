import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  CalendarCheck, 
  Trophy, 
  UserCircle2, 
  Settings, 
  UserCog, 
  LogOut,
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setIsLoggedIn(true);
      setUserName(user.full_name || "Kullanıcı");
      setIsAdmin(user.role === 'admin');
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.push("/login");
    toast({
      title: "Çıkış Yapıldı",
      description: "Başarıyla çıkış yaptınız.",
    });
  };

  const DashboardButton = ({ href, icon: Icon, title, desc, color, delay }: any) => (
    <Link href={href} className="block group">
      <div 
        className={`relative overflow-hidden p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white dark:bg-gray-900 h-full flex flex-col justify-between`}
      >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
          <Icon className={`w-24 h-24 ${color}`} />
        </div>
        
        <div>
          <div className={`w-12 h-12 rounded-xl ${color.replace('text-', 'bg-').replace('600', '100')} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
        </div>

        <div className="mt-4 flex items-center text-sm font-medium text-gray-400 group-hover:text-emerald-600 transition-colors">
          Git <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </Link>
  );

  if (isLoggedIn) {
    return (
      <>
        <SEO title="Panel - Sportex" />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <Navigation />
          
          <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Merhaba, {userName} 👋
                </h1>
                <p className="text-gray-500">Bugün ne yapmak istersin?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <DashboardButton 
                href="/students"
                icon={Users}
                title="Öğrenciler"
                desc="Öğrenci listesi ve profiller"
                color="text-blue-600"
              />
              
              <DashboardButton 
                href="/attendance"
                icon={CalendarCheck}
                title="Yoklama"
                desc="Antrenman yoklaması al"
                color="text-emerald-600"
              />

              <DashboardButton 
                href="/performance"
                icon={Trophy}
                title="Performans"
                desc="Testler ve raporlar"
                color="text-amber-600"
              />

              {isAdmin && (
                <>
                  <DashboardButton 
                    href="/coaches"
                    icon={UserCog}
                    title="Antrenörler"
                    desc="Teknik ekip yönetimi"
                    color="text-purple-600"
                  />
                  
                  <DashboardButton 
                    href="/groups"
                    icon={Activity} // Changed from Users (duplicate) to Activity for variety
                    title="Gruplar"
                    desc="Yaş grubu ve takım ayarları"
                    color="text-indigo-600"
                  />
                </>
              )}

              <DashboardButton 
                href="/settings"
                icon={Settings}
                title="Ayarlar"
                desc="Sistem ve profil ayarları"
                color="text-gray-600"
              />
            </div>

            {/* Quick Actions / Stats Summary could go here */}
          </main>
        </div>
      </>
    );
  }

  // Landing Page (Not Logged In)
  return (
    <>
      <SEO title="Sportex - Futbol Okulu Yönetim Sistemi" />
      
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <Navigation />

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
              <Link href="/login">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all">
                  <UserCircle2 className="w-5 h-5 mr-2" />
                  Giriş Yap
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature Cards ... (Keep existing ones) */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-blue-600 mb-4" />
                  <h3 className="text-lg font-bold text-blue-900 mb-2">Öğrenci Yönetimi</h3>
                  <p className="text-blue-700 text-sm">Detaylı profil kartları ve sağlık raporları.</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <CardContent className="pt-6">
                  <CalendarCheck className="w-10 h-10 text-purple-600 mb-4" />
                  <h3 className="text-lg font-bold text-purple-900 mb-2">Yoklama Sistemi</h3>
                  <p className="text-purple-700 text-sm">Mobil uyumlu hızlı yoklama ve takip.</p>
                </CardContent>
              </Card>
               <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                <CardContent className="pt-6">
                  <Trophy className="w-10 h-10 text-amber-600 mb-4" />
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Performans</h3>
                  <p className="text-amber-700 text-sm">Gelişim raporları ve istatistikler.</p>
                </CardContent>
              </Card>
               <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-emerald-600 mb-4" />
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">Antrenörler</h3>
                  <p className="text-emerald-700 text-sm">Teknik ekip yönetimi ve atamalar.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}