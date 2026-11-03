import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { 
  Users, 
  CalendarCheck, 
  Trophy, 
  Settings, 
  UserCog, 
  ChevronRight,
  Activity,
  CreditCard,
  BarChart3,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isAdmin, isManagement, isParent, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  // Veliler personel panelini görmez; kendi portalına yönlendirilir
  useEffect(() => {
    if (!roleLoading && isParent) router.replace("/portal");
  }, [roleLoading, isParent, router]);

  const checkUser = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setIsLoggedIn(true);
      setUserName(user.full_name || "Kullanıcı");
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setIsLoggedIn(false);
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
        <SEO title="Panel - FootbalLab" />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <Navigation />
          
          <main className="container mx-auto px-4 py-4 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
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

              {isManagement && (
                <>
                  <DashboardButton 
                    href="/payments"
                    icon={CreditCard}
                    title="Ödemeler"
                    desc="Tahsilat ve ödeme takibi"
                    color="text-green-600"
                  />

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
                href="/reports"
                icon={BarChart3}
                title="Raporlar"
                desc={isManagement ? "Mali, yoklama ve performans raporları" : "Yoklama ve performans raporları"}
                color="text-cyan-600"
              />

              {isAdmin && (
                <>
                  <DashboardButton 
                    href="/users"
                    icon={ShieldCheck}
                    title="Kullanıcılar"
                    desc="Yönetici ve antrenör yetkileri"
                    color="text-rose-600"
                  />

                  <DashboardButton 
                    href="/settings"
                    icon={Settings}
                    title="Ayarlar"
                    desc="Sistem ve profil ayarları"
                    color="text-gray-600"
                  />
                </>
              )}
            </div>

            {/* Quick Actions / Stats Summary could go here */}
          </main>
        </div>
      </>
    );
  }

  // Oturum bilgisi gelene kadar (veya giriş yoksa giriş sayfasına yönlendirilene kadar)
  // sade bir yükleme göstergesi; tanıtım sayfası yok.
  return (
    <>
      <SEO title="FootbalLab" />
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    </>
  );
}
