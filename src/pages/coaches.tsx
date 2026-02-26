import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, UserCircle, Award, Calendar, Loader2 } from "lucide-react";
import { coachService } from "@/services/coachService";
import { CoachForm } from "@/components/coaches/CoachForm";
import type { Tables } from "@/integrations/supabase/types";

type Coach = Tables<"coaches">;

export default function CoachesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadCoaches();
    loadStats();
  }, []);

  const loadCoaches = async () => {
    try {
      setLoading(true);
      const data = await coachService.getAllCoaches();
      setCoaches(data);
    } catch (error) {
      console.error("Error loading coaches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await coachService.getCoachStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const filteredCoaches = coaches.filter(coach =>
    coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAvgExperience = () => {
    if (coaches.length === 0) return 0;
    const total = coaches.reduce((sum, coach) => {
      const years = parseInt(coach.experience?.replace(/\D/g, "") || "0");
      return sum + years;
    }, 0);
    return (total / coaches.length).toFixed(1);
  };

  return (
    <>
      <SEO title="Antrenörler - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Antrenör Yönetimi</h1>
              <p className="text-gray-600 mt-1">Teknik kadro ve grup atamaları</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Antrenör
            </Button>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Antrenör adı veya uzmanlık ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Toplam Antrenör</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{coaches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Aktif Antrenör</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">UEFA Lisanslı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {coaches.filter(c => c.license?.includes("UEFA")).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Ort. Deneyim</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{calculateAvgExperience()} Yıl</div>
              </CardContent>
            </Card>
          </div>

          {/* Loading State */}
          {loading && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Antrenörler yükleniyor...</p>
              </CardContent>
            </Card>
          )}

          {/* Coaches List */}
          {!loading && (
            <div className="grid gap-6">
              {filteredCoaches.map((coach) => (
                <Card key={coach.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      {/* Avatar */}
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {coach.name.split(" ").map(n => n[0]).join("")}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold text-gray-900">{coach.name}</h3>
                              <Badge className="bg-emerald-100 text-emerald-800">
                                {coach.status}
                              </Badge>
                            </div>
                            {coach.specialty && (
                              <p className="text-lg text-gray-600 font-medium">{coach.specialty}</p>
                            )}
                          </div>
                          <Button variant="outline">
                            Düzenle
                          </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            {coach.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{coach.phone}</span>
                              </div>
                            )}
                            {coach.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4" />
                                <span>{coach.email}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {coach.experience && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>Deneyim: <strong>{coach.experience}</strong></span>
                              </div>
                            )}
                            {coach.license && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Award className="w-4 h-4" />
                                <span>Lisans: <strong>{coach.license}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredCoaches.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Antrenör bulunamadı</h3>
                <p className="text-gray-600 mb-4">
                  {coaches.length === 0 
                    ? "Henüz kayıtlı antrenör bulunmuyor. Yeni antrenör ekleyin." 
                    : "Arama kriterlerinize uygun antrenör bulunamadı."}
                </p>
                {coaches.length === 0 && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Antrenörü Ekle
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <CoachForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          onSuccess={() => {
            loadCoaches();
            loadStats();
          }} 
        />
      </div>
    </>
  );
}