import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Home, Users, ClipboardCheck, BarChart3, UserCircle, Grid3x3, Bell, Settings, CalendarCheck, UserCircle2 } from "lucide-react";

export function Navigation() {
  const router = useRouter();

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

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/students">
                <Button variant={router.pathname === "/students" ? "default" : "ghost"} className="gap-2">
                  <Users className="w-4 h-4" />
                  Öğrenciler
                </Button>
              </Link>
              <Link href="/groups">
                <Button variant={router.pathname === "/groups" ? "default" : "ghost"} className="gap-2">
                  <Users className="w-4 h-4" />
                  Gruplar
                </Button>
              </Link>
              <Link href="/coaches">
                <Button variant={router.pathname === "/coaches" ? "default" : "ghost"} className="gap-2">
                  <UserCircle2 className="w-4 h-4" />
                  Antrenörler
                </Button>
              </Link>
              <Link href="/attendance">
                <Button variant={router.pathname === "/attendance" ? "default" : "ghost"} className="gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  Yoklama
                </Button>
              </Link>
              <Link href="/notifications">
                <Button variant={router.pathname === "/notifications" ? "default" : "ghost"} className="gap-2">
                  <Bell className="w-4 h-4" />
                  Bildirimler
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant={router.pathname === "/reports" ? "default" : "ghost"} className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Raporlar
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant={router.pathname === "/settings" ? "default" : "ghost"} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Ayarlar
                </Button>
              </Link>
            </nav>
          </div>

          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Giriş Yap
          </Button>
        </div>
      </div>
    </header>
  );
}