import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Calendar, TrendingUp, UserCircle, Clock } from "lucide-react";

export default function GroupsPage() {
  // Mock data
  const groups = [
    {
      id: 1,
      name: "U13 - Yeşil Takım",
      ageGroup: "12-13 yaş",
      students: 15,
      coach: "Ali Kaya",
      schedule: ["Pazartesi 16:00", "Çarşamba 16:00", "Cuma 16:00"],
      attendance: 94,
      color: "emerald"
    },
    {
      id: 2,
      name: "U12 - Mavi Takım",
      ageGroup: "11-12 yaş",
      students: 18,
      coach: "Mustafa Yıldız",
      schedule: ["Salı 17:00", "Perşembe 17:00", "Cumartesi 10:00"],
      attendance: 96,
      color: "blue"
    },
    {
      id: 3,
      name: "U14 - Kırmızı Takım",
      ageGroup: "13-14 yaş",
      students: 14,
      coach: "Ali Kaya",
      schedule: ["Pazartesi 17:30", "Çarşamba 17:30", "Cuma 17:30"],
      attendance: 91,
      color: "red"
    },
    {
      id: 4,
      name: "U11 - Sarı Takım",
      ageGroup: "10-11 yaş",
      students: 13,
      coach: "Hakan Özkan",
      schedule: ["Salı 16:00", "Perşembe 16:00", "Cumartesi 11:30"],
      attendance: 98,
      color: "amber"
    },
  ];

  const colorClasses = {
    emerald: "from-emerald-500 to-green-600",
    blue: "from-blue-500 to-blue-700",
    red: "from-red-500 to-red-700",
    amber: "from-amber-500 to-yellow-600"
  };

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
                <div className="text-3xl font-bold text-emerald-600">
                  {groups.reduce((sum, g) => sum + g.students, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Ort. Grup Büyüklüğü</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(groups.reduce((sum, g) => sum + g.students, 0) / groups.length)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Ort. Devam</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(groups.reduce((sum, g) => sum + g.attendance, 0) / groups.length)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Groups Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-all border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[group.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center`}>
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-1">{group.name}</CardTitle>
                        <p className="text-sm text-gray-600">{group.ageGroup}</p>
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
                            <p className="text-lg font-bold text-gray-900">{group.students}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Devam</p>
                            <p className="text-lg font-bold text-gray-900">{group.attendance}%</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <UserCircle className="w-4 h-4" />
                          <span className="text-sm">Antrenör</span>
                        </div>
                        <p className="font-semibold text-gray-900">{group.coach}</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="schedule" className="mt-4">
                      <div className="space-y-3">
                        {group.schedule.map((time, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900">{time}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600">Haftalık 3 antrenman</p>
                      </div>
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
            ))}
          </div>
        </div>
      </div>
    </>
  );
}