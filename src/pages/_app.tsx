import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { userService } from "@/services/userService";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const publicPaths = ["/login"];

  useEffect(() => {
    // Check authentication on route change
    const checkAuth = () => {
      const isPublicPath = publicPaths.includes(router.pathname);
      const isLoggedIn = userService.isLoggedIn();

      if (!isPublicPath && !isLoggedIn) {
        router.push("/login");
      } else if (isPublicPath && isLoggedIn) {
        router.push("/");
      }
    };

    checkAuth();
  }, [router.pathname]);

  return (
    <>
      <Component {...pageProps} />
      <Toaster />
    </>
  );
}