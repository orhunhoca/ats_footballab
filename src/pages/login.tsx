import { useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/userService";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await userService.login(username, password);

      if (!user) {
        toast({
          title: "Giriş Başarısız",
          description: "Kullanıcı adı veya şifre hatalı.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Hoş Geldiniz!",
        description: `${user.full_name} olarak giriş yaptınız.`,
      });

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Hata",
        description: "Giriş yapılırken bir hata oluştu.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Giriş Yap - Sportex Futbol Okulu"
        description="Sportex Futbol Okulu yönetim sistemine giriş yapın"
      />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-48 h-24 relative flex items-center justify-center mb-2">
              <img 
                src="/sportex-logo.png" 
                alt="Sportex Logo" 
                className="object-contain w-full h-full"
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Sportex Futbol Okulu
            </CardTitle>
            <CardDescription className="text-base">
              Yönetim sistemine giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Kullanıcı adınızı girin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Giriş Yapılıyor..."
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Giriş Yap
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}