import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, UserCircle, Award, Calendar } from "lucide-react";

export default function CoachesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data
  const coaches = [
    {
      id: 1,
      name: "Ali Kaya",
      specialty: "Teknik Direktör",
      phone: "0532 111 2233",
      email: "ali@example.com",
      groups: ["U13 - Yeşil Takım", "U14 - Kırmızı Takım"],
      experience: "15 yıl",
      license: "UEFA A",
      status: "Aktif"
    },
    {
      id: 2,
      name: "Mustafa Yıldız",
      specialty: "Yardımcı Antrenör",
      phone: "0533 222 3344",
      email: "mustafa@example.com",
      groups: ["U12 - Mavi Takım"],
      experience: "8 yıl",
      license: "UEFA B",
      status: "Aktif"
    },
    {
      id: 3,
      name: "Emre Şahin",
      specialty: "Kondisyon Antrenörü",
      phone: "0534 333 4455",
      email: "emre@example.com",
      groups: ["Tüm Gruplar"],
      experience: "5 yıl",
      license: "Spor Bilimleri",
      status: "Aktif"
    },
    {
      id: 4,
      name: "Hakan Özkan",
      specialty: "Kaleci Antrenörü",
      phone: "0535 444 5566",
      email: "hakan@example.com",
      groups: ["U11 - Sarı Takım", "U12 - Mavi Takım"],
      experience: "10 yıl",
      license: "UEFA B",
      status: "Aktif"
    },
  ];

  const filteredCoaches = coaches.filter(coach =>
    coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Button className="bg-emerald-600 hover:bg-emerald-700">
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
                <div className="text-3xl font-bold text-emerald-600">
                  {coaches.filter(c => c.status === "Aktif").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">UEFA Lisanslı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {coaches.filter(c => c.license.includes("UEFA")).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Ort. Deneyim</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">9.5 Yıl</div>
              </CardContent>
            </Card>
          </div>

          {/* Coaches List */}
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
                          <p className="text-lg text-gray-600 font-medium">{coach.specialty}</p>
                        </div>
                        <Button variant="outline">
                          Düzenle
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{coach.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{coach.email}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Deneyim: <strong>{coach.experience}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Award className="w-4 h-4" />
                            <span>Lisans: <strong>{coach.license}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Groups */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Sorumlu Gruplar:</h4>
                        <div className="flex flex-wrap gap-2">
                          {coach.groups.map((group, idx) => (
                            <Badge key={idx} variant="outline" className="text-sm">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCoaches.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Antrenör bulunamadı</h3>
                <p className="text-gray-600">Arama kriterlerinize uygun antrenör bulunamadı.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}