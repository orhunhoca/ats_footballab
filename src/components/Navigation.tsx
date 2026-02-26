import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Home, Users, ClipboardCheck, BarChart3, UserCircle, Grid3x3, Bell, Settings, CalendarCheck, UserCircle2, LogOut, Menu, X } from "lucide-react";
import { userService, type User } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(userService.getCurrentUser());
    setIsAdmin(userService.isAdmin());
  }, []);

  const handleLogout = () => {
    userService.logout();
    toast({
      title: "Çıkış Yapıldı",
      description: "Başarıyla çıkış yaptınız.",
    });
    router.push("/login");
  };

  const menuItems = [
    { href: "/students", label: "Öğrenciler", icon: Users },
    { href: "/groups", label: "Gruplar", icon: Users },
    { href: "/coaches", label: "Antrenörler", icon: UserCircle2 },
    { href: "/attendance", label: "Yoklama", icon: CalendarCheck },
    { href: "/notifications", label: "Bildirimler", icon: Bell },
    { href: "/reports", label: "Raporlar", icon: BarChart3 },
  ];

  if (isAdmin) {
    menuItems.push({ href: "/settings", label: "Ayarlar", icon: Settings });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
                <UserCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Sportex
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
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
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 py-4">
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