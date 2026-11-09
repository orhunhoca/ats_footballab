import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { ChevronDown, Home, Users, ClipboardCheck, BarChart3, UserCog, Users as GroupIcon, Bell, Settings, LogOut, Menu, X, TrendingUp, CreditCard, Dumbbell, Camera, UserCircle2, CalendarCheck, ShieldCheck } from "lucide-react";
import { type User } from "@/services/userService";
import { useUserRole } from "@/hooks/useUserRole";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { role } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Rol bazlı menü: admin = her şey; yönetici = tüm operasyon (şube/ayar/kullanıcı hariç);
  // antrenör = öğrenci ve deneme öğrencisi kaydı, yoklama, performans, raporlar
  // priority: 1 = hep çubukta, 2 = geniş ekranda çubukta (dar ekranda "Diğer" menüsünde), 3 = hep "Diğer" menüsünde
  type MenuItem = { href: string; label: string; icon: typeof Users; roles: ("admin" | "manager" | "coach" | "parent")[]; priority: 1 | 2 | 3 };
  const allItems: MenuItem[] = [
    { href: "/students", label: "Öğrenciler", icon: Users, roles: ["admin", "manager", "coach"], priority: 1 },
    { href: "/trial-students", label: "Deneme Öğrencileri", icon: Users, roles: ["admin", "manager", "coach"], priority: 1 },
    { href: "/groups", label: "Gruplar", icon: Users, roles: ["admin", "manager"], priority: 1 },
    { href: "/coaches", label: "Antrenörler", icon: UserCircle2, roles: ["admin", "manager"], priority: 1 },
    { href: "/attendance", label: "Yoklama", icon: CalendarCheck, roles: ["admin", "manager", "coach"], priority: 1 },
    { href: "/performance", label: "Performans", icon: TrendingUp, roles: ["admin", "manager", "coach"], priority: 1 },
    { href: "/payments", label: "Ödemeler", icon: CreditCard, roles: ["admin", "manager"], priority: 2 },
    { href: "/training", label: "Antrenman Programları", icon: Dumbbell, roles: ["admin", "manager", "coach"], priority: 3 },
    { href: "/gallery", label: "Galeri", icon: Camera, roles: ["admin", "manager"], priority: 3 },
    { href: "/notifications", label: "Bildirimler", icon: Bell, roles: ["admin", "manager"], priority: 2 },
    { href: "/reports", label: "Raporlar", icon: BarChart3, roles: ["admin", "manager", "coach"], priority: 3 },
    { href: "/users", label: "Kullanıcılar", icon: ShieldCheck, roles: ["admin"], priority: 3 },
    { href: "/settings", label: "Ayarlar", icon: Settings, roles: ["admin"], priority: 3 },
    { href: "/portal", label: "Veli Portalı", icon: Home, roles: ["parent"], priority: 1 },
  ];
  const menuItems = allItems.filter((item) => role !== null && item.roles.includes(role));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center" aria-label="FootbalLab ana sayfa">
              <Brand size={40} />
            </Link>

            <nav className="hidden xl:flex items-center gap-1">
              {menuItems
                .filter((i) => i.priority < 3)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className={item.priority === 2 ? "hidden min-[2100px]:block" : undefined}>
                      <Button variant={router.pathname === item.href ? "default" : "ghost"} className="gap-2">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              {menuItems.some((i) => i.priority >= 2) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={menuItems.some((i) => i.priority >= 2 && router.pathname === i.href) ? "default" : "ghost"} className="gap-1.5">
                      Diğer
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[14rem]">
                    {menuItems
                      .filter((i) => i.priority >= 2)
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem key={item.href} asChild className={item.priority === 2 ? "min-[2100px]:hidden" : undefined}>
                            <Link href={item.href} className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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