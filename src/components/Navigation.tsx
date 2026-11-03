import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Home, Users, ClipboardCheck, BarChart3, UserCog, Users as GroupIcon, Bell, Settings, LogOut, Menu, X, TrendingUp, CreditCard, Dumbbell, Camera, UserCircle2, CalendarCheck, Building2 } from "lucide-react";
import { userService, type User } from "@/services/userService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import { BranchSwitcher } from "@/components/BranchSwitcher";

export function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await userService.isAdmin();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const handleLogout = async () => {
    try {
      // userService.logout yalnızca eski bir localStorage kaydını siliyordu;
      // Supabase oturumunu gerçekten kapat.
      await authService.signOut();
      toast({
        title: "Çıkış Yapıldı",
        description: "Başarıyla çıkış yaptınız.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    { href: "/students", label: "Öğrenciler", icon: Users },
    { href: "/trial-students", label: "Deneme Öğrencileri", icon: Users },
    { href: "/groups", label: "Gruplar", icon: Users },
    { href: "/coaches", label: "Antrenörler", icon: UserCircle2 },
    { href: "/attendance", label: "Yoklama", icon: CalendarCheck },
    { href: "/performance", label: "Performans", icon: TrendingUp },
    { href: "/payments", label: "Ödemeler", icon: CreditCard },
    { href: "/training", label: "Antrenman Programları", icon: Dumbbell },
    { href: "/gallery", label: "Galeri", icon: Camera },
    { href: "/notifications", label: "Bildirimler", icon: Bell },
    { href: "/reports", label: "Raporlar", icon: BarChart3 },
  ];

  if (isAdmin) {
    menuItems.push({ href: "/branches", label: "Şubeler", icon: Building2 });
    menuItems.push({ href: "/settings", label: "Ayarlar", icon: Settings });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center" aria-label="FootbalLab ana sayfa">
              <Brand size={40} />
            </Link>

            <nav className="hidden xl:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant={router.pathname === item.href ? "default" : "ghost"} className="gap-2">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <BranchSwitcher className="hidden sm:flex" />
            {currentUser && (
              <span className="text-sm text-slate-600 dark:text-slate-400 hidden md:block">
                {currentUser.full_name}
              </span>
            )}
            <Button 
              variant="ghost" 
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 hidden md:flex"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Çıkış
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 py-4">
            <BranchSwitcher className="mb-3 w-full sm:hidden" />
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={router.pathname === item.href ? "default" : "ghost"} 
                      className="w-full justify-start gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                {currentUser && (
                  <div className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                    {currentUser.full_name}
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Çıkış
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}