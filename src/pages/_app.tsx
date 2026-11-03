import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { BranchProvider } from "@/contexts/BranchContext";
import { Footer } from "@/components/Footer";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  // Giriş gerektirmeyen sayfalar (hukuki metinler herkese açıktır)
  const publicPaths = ["/login", "/kvkk", "/acik-riza", "/cerez-politikasi"];

  useEffect(() => {
    // Check authentication on mount and route change
    const checkAuth = async () => {
      const isPublicPath = publicPaths.includes(router.pathname);
      
      try {
        // Oturumu sunucuya doğrulat: silinmiş/geçersiz kullanıcının
        // tarayıcıda kalan oturumu temizlenir, yönlendirme döngüsü oluşmaz.
        const session = await authService.getValidSession();
        const isLoggedIn = !!session;
        setIsAuthed(isLoggedIn);

        if (!isPublicPath && !isLoggedIn) {
          router.push("/login");
        } else if (router.pathname === "/login" && isLoggedIn) {
          router.push("/");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (!isPublicPath) {
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BranchProvider enabled={isAuthed && !publicPaths.includes(router.pathname)}>
      <Component {...pageProps} />
      <Footer />
      <Toaster />
    </BranchProvider>
  );
}