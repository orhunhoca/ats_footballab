import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Home, Users, ClipboardCheck, BarChart3, UserCircle, Grid3x3, Bell } from "lucide-react";

export function Navigation() {
  const router = useRouter();
  
  const navItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/students", label: "Öğrenciler", icon: Users },
    { href: "/attendance", label: "Yoklama", icon: ClipboardCheck },
    { href: "/groups", label: "Gruplar", icon: Grid3x3 },
    { href: "/coaches", label: "Antrenörler", icon: UserCircle },
    { href: "/reports", label: "Raporlar", icon: BarChart3 },
    { href: "/notifications", label: "Bildirimler", icon: Bell },
  ];

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 2 L12 22 M2 12 L22 12 M6 6 L18 18 M6 18 L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Futbol Okulu</h1>
              <p className="text-xs text-gray-600">Yönetim Sistemi</p>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    size="sm"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Giriş Yap
          </Button>
        </div>
      </div>
    </header>
  );
}