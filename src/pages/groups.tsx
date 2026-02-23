import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, TrendingUp, UserCircle, Clock, Loader2 } from "lucide-react";
import { groupService } from "@/services/groupService";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupService.getAll();
      setGroups(data);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const colorClasses: Record<string, string> = {
    emerald: "from-emerald-500 to-green-600",
    blue: "from-blue-500 to-blue-700",
    red: "from-red-500 to-red-700",
    amber: "from-amber-500 to-yellow-600",
    purple: "from-purple-500 to-purple-700",
    pink: "from-pink-500 to-pink-700"
  };

  const parseSchedule = (schedule: string | null) => {
    if (!schedule) return [];
    try {
      return JSON.parse(schedule);
    } catch {
      return [];
    }
  };

  const totalStudents = groups.reduce((sum, g) => sum + (g.student_count || 0), 0);
  const avgGroupSize = groups.length > 0 ? Math.round(totalStudents / groups.length) : 0;

  return (
    <>
      <SEO title="Grup Yönetimi - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grup Yönetimi</h1>
              <p className="text-gray-600 mt-1">Takımlar, program ve öğrenci atamaları</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Grup
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Toplam Grup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{groups.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Toplam Öğrenci</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{totalStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Ort. Grup Büyüklüğü</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{avgGroupSize}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Aktif Grup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {groups.filter(g => g.status === "Aktif").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loading State */}
          {loading && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Gruplar yükleniyor...</p>
              </CardContent>
            </Card>
          )}

          {/* Groups Grid */}
          {!loading && (
            <div className="grid md:grid-cols-2 gap-6">
              {groups.map((group) => {
                const schedule = parseSchedule(group.schedule);
                const colorKey = (group.color || "emerald") as keyof typeof colorClasses;
                
                return (
                  <Card key={group.id} className="hover:shadow-lg transition-all border-2">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[colorKey] || colorClasses.emerald} rounded-2xl flex items-center justify-center`}>
                            <Users className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl mb-1">{group.name}</CardTitle>
                            <p className="text-sm text-gray-600">{group.age_group}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Düzenle
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="info" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="info">Bilgiler</TabsTrigger>
                          <TabsTrigger value="schedule">Program</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="info" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Öğrenci</p>
                                <p className="text-lg font-bold text-gray-900">{group.student_count || 0}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Durum</p>
                                <p className="text-sm font-bold text-gray-900">{group.status}</p>
                              </div>
                            </div>
                          </div>
                          
                          {group.description && (
                            <div className="pt-3 border-t">
                              <p className="text-sm text-gray-600">{group.description}</p>
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="schedule" className="mt-4">
                          <div className="space-y-3">
                            {schedule.length > 0 ? (
                              schedule.map((time: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="font-medium text-gray-900">{time}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
                                Antrenman programı henüz belirlenmedi
                              </p>
                            )}
                          </div>
                          {schedule.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm text-gray-600">Haftalık {schedule.length} antrenman</p>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>

                      <div className="mt-4 pt-4 border-t">
                        <Button className="w-full" variant="outline">
                          <Users className="w-4 h-4 mr-2" />
                          Öğrencileri Gör
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && groups.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Grup bulunamadı</h3>
                <p className="text-gray-600 mb-4">Henüz kayıtlı grup bulunmuyor. Yeni grup oluşturun.</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Grubu Oluştur
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}