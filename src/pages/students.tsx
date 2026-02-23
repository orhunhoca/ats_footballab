import { SEO } from "@/components/SEO";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, UserCircle2, Phone, Mail, Calendar } from "lucide-react";

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - Supabase bağlandığında gerçek verilerle değiştirilecek
  const students = [
    { id: 1, name: "Ahmet Yılmaz", age: 12, group: "U13 - Yeşil Takım", phone: "0532 123 4567", email: "ahmet@example.com", status: "Aktif" },
    { id: 2, name: "Mehmet Demir", age: 11, group: "U12 - Mavi Takım", phone: "0533 234 5678", email: "mehmet@example.com", status: "Aktif" },
    { id: 3, name: "Can Öztürk", age: 13, group: "U14 - Kırmızı Takım", phone: "0534 345 6789", email: "can@example.com", status: "Aktif" },
    { id: 4, name: "Ege Kaya", age: 10, group: "U11 - Sarı Takım", phone: "0535 456 7890", email: "ege@example.com", status: "Aktif" },
    { id: 5, name: "Burak Şahin", age: 12, group: "U13 - Yeşil Takım", phone: "0536 567 8901", email: "burak@example.com", status: "Pasif" },
    { id: 6, name: "Eren Aydın", age: 14, group: "U14 - Kırmızı Takım", phone: "0537 678 9012", email: "eren@example.com", status: "Aktif" },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEO title="Öğrenci Yönetimi - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
                <p className="text-gray-600 mt-1">Tüm öğrencileri görüntüle ve yönet</p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Öğrenci
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Öğrenci adı veya grup ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrele
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Toplam Öğrenci</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{students.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Aktif Öğrenci</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {students.filter(s => s.status === "Aktif").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Grup Sayısı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">4</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Bu Ay Kayıt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">3</div>
              </CardContent>
            </Card>
          </div>

          {/* Students List */}
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {student.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                          <Badge variant={student.status === "Aktif" ? "default" : "secondary"}>
                            {student.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <UserCircle2 className="w-4 h-4" />
                            <span>{student.age} yaşında</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium text-emerald-600">{student.group}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{student.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{student.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Düzenle
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <UserCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenci bulunamadı</h3>
                <p className="text-gray-600">Arama kriterlerinize uygun öğrenci bulunamadı.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}