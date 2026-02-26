import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, UserCircle2, Phone, Mail, Calendar, Loader2, AlertTriangle, Shirt, Clock, MessageCircle } from "lucide-react";
import { studentService } from "@/services/studentService";
import { StudentForm } from "@/components/students/StudentForm";
import type { Tables } from "@/integrations/supabase/types";
import { TableHead } from "@/components/ui/table";

// Extend type locally until generated types catch up
type Student = Tables<"students"> & {
  clothing_size?: string;
  health_report_submitted?: boolean;
  work_group_hour?: string;
  payment_plan?: string;
  payment_status?: string;
  registration_type?: string;
};

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
    loadStats();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      setStudents(data as any);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await studentService.getStudentStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.mother_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.mother_phone?.includes(searchTerm) ||
    student.father_phone?.includes(searchTerm)
  );

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const isHealthReportMissing = (student: Student) => {
    if (student.health_report_submitted) return false;
    const created = new Date(student.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 10;
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");
    // If it starts with 0, replace with 90 (Turkey country code)
    if (cleaned.startsWith("0")) {
      return "90" + cleaned.substring(1);
    }
    // If it doesn't start with country code, add 90
    if (!cleaned.startsWith("90")) {
      return "90" + cleaned;
    }
    return cleaned;
  };

  return (
    <>
      <SEO title="Öğrenci Yönetimi - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
              <p className="text-gray-600 mt-1">Tüm öğrencileri görüntüle ve yönet</p>
            </div>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Öğrenci
            </Button>
          </div>

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
                <div className="text-3xl font-bold text-emerald-600">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Raporu Eksik</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {students.filter(s => isHealthReportMissing(s)).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Bu Ay Kayıt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {students.filter(s => {
                    const created = new Date(s.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && 
                           created.getFullYear() === now.getFullYear();
                  }).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Öğrenci adı veya e-posta ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Öğrenciler yükleniyor...</p>
              </CardContent>
            </Card>
          )}

          {/* Students List */}
          {!loading && (
            <div className="grid gap-4">
              {filteredStudents.map((student) => (
                <Card key={student.id} className={`hover:shadow-md transition-shadow ${isHealthReportMissing(student) ? 'border-l-4 border-l-red-500' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                            <Badge variant={student.status === "Aktif" ? "default" : "secondary"}>
                              {student.status}
                            </Badge>
                            {isHealthReportMissing(student) && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Rapor Eksik
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <UserCircle2 className="w-4 h-4" />
                              <span>{calculateAge(student.birth_date)} yaşında</span>
                            </div>
                            
                            {student.work_group_hour && (
                              <div className="flex items-center gap-2 text-blue-600 font-medium">
                                <Clock className="w-4 h-4" />
                                <span>{student.work_group_hour}</span>
                              </div>
                            )}

                            {student.clothing_size && (
                              <div className="flex items-center gap-2">
                                <Shirt className="w-4 h-4" />
                                <span>Beden: {student.clothing_size}</span>
                              </div>
                            )}

                            {(student.mother_phone || student.father_phone) && (
                              <div className="flex flex-col gap-1">
                                {student.mother_phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>Anne: {student.mother_phone}</span>
                                  </div>
                                )}
                                {student.father_phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>Baba: {student.father_phone}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Mobile Contact Buttons */}
                          {(student.mother_phone || student.father_phone) && (
                            <div className="flex flex-col gap-2 mt-3">
                              {student.mother_phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-16">Anne:</span>
                                  <div className="flex gap-2">
                                    <a
                                      href={`tel:${student.mother_phone}`}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-medium"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>Ara</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/90${student.mother_phone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </div>
                                </div>
                              )}
                              {student.father_phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-16">Baba:</span>
                                  <div className="flex gap-2">
                                    <a
                                      href={`tel:${student.father_phone}`}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-medium"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>Ara</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/90${student.father_phone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 text-right">
                         <div className="text-sm">
                            <span className="text-gray-500">Ödeme:</span>
                            <span className={`ml-2 font-medium ${student.payment_status === "Ödendi" ? "text-green-600" : "text-amber-600"}`}>
                              {student.payment_status}
                            </span>
                         </div>
                         <div className="text-xs text-gray-500">
                           {student.payment_plan}
                         </div>
                         <Button variant="outline" size="sm" className="mt-2" onClick={() => {
                           setEditingStudent(student);
                           setIsFormOpen(true);
                         }}>
                            Düzenle
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredStudents.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <UserCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenci bulunamadı</h3>
                <p className="text-gray-600 mb-4">
                  {students.length === 0 
                    ? "Henüz kayıtlı öğrenci bulunmuyor." 
                    : "Arama kriterlerinize uygun öğrenci bulunamadı."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <StudentForm 
          open={isFormOpen} 
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingStudent(null);
          }}
          student={editingStudent}
          onSuccess={() => {
            loadStudents();
            loadStats();
            setEditingStudent(null);
          }} 
        />
      </div>
    </>
  );
}