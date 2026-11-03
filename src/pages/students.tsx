import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, UserCircle2, Phone, Mail, Calendar, Loader2, AlertTriangle, Shirt, Clock, MessageCircle, Trash2, Edit, MoreHorizontal } from "lucide-react";
import { studentService } from "@/services/studentService";
import { StudentForm } from "@/components/students/StudentForm";
import type { Tables } from "@/integrations/supabase/types";
import { TableHead } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Define extended student type with relations
type StudentWithGroups = Tables<"students"> & {
  student_groups?: { group_id: string }[] | null;
};

// Extend type locally until generated types catch up
type Student = Tables<"students"> & {
  clothing_size?: string;
  health_report_submitted?: boolean;
  work_group_hour?: string;
  payment_plan?: string;
  payment_status?: string;
  registration_type?: string;
  registration_start_date?: string;
  registration_end_date?: string;
  summer_clothing_paid?: boolean;
  winter_clothing_paid?: boolean;
  summer_clothing_price?: number;
  winter_clothing_price?: number;
};

function StudentsPageInner() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteReason, setDeleteReason] = useState<"Kayıt İptali" | "Ara Veriyor" | "Yönetim Sildi">("Kayıt İptali");

  const { selectedBranchId, branches, getBranchName } = useBranch();
  // Antrenörler öğrenci kaydı ekleyip düzenleyebilir; silme ve ödeme bilgisi yalnızca yönetime aittir
  const { isManagement: canManage, role: userRole } = useUserRole();
  const canRegister = userRole !== null;

  useEffect(() => {
    loadStudents();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents(selectedBranchId);
      setStudents(data as any);
    } catch (error) {
      console.error("Error loading students:", error);
      toast({
        title: "Hata",
        description: "Öğrenciler yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await studentService.getStudentStats(selectedBranchId);
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

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteReason("Kayıt İptali"); // Default value
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      await studentService.updateStudentStatus(studentToDelete.id, deleteReason);
      
      toast({
        title: "Başarılı",
        description: `Öğrenci durumu "${deleteReason}" olarak güncellendi.`,
      });
      
      loadStudents();
      loadStats();
    } catch (error) {
      console.error("Error updating student status:", error);
      toast({
        title: "Hata",
        description: "İşlem sırasında bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  return (
    <>
      <SEO title="Öğrenci Yönetimi - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
              <p className="text-gray-600 mt-1">Tüm öğrencileri görüntüle ve yönet</p>
            </div>
            {canRegister && (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Öğrenci
              </Button>
            )}
          </div>

          <BranchFilterBar />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                            {branches.length > 1 && (
                              <Badge variant="outline" className="text-xs">{getBranchName((student as any).branch_id)}</Badge>
                            )}
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
                              <Calendar className="w-4 h-4" />
                              <span>Doğum: {student.birth_date ? new Date(student.birth_date).toLocaleDateString('tr-TR') : '-'}</span>
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

                            {student.registration_end_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Bitiş: {new Date(student.registration_end_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                            )}

                            {(student.summer_clothing_paid || student.winter_clothing_paid) && (
                              <div className="flex items-center gap-2 text-green-600">
                                <Shirt className="w-4 h-4" />
                                <span>
                                  {student.summer_clothing_paid && "Yazlık ✓"}
                                  {student.summer_clothing_paid && student.winter_clothing_paid && " • "}
                                  {student.winter_clothing_paid && "Kışlık ✓"}
                                </span>
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
                         {canManage && (
                           <>
                             <div className="text-sm">
                               <span className="text-gray-500">Ödeme:</span>
                               <span className={`ml-2 font-medium ${student.payment_status === "Ödendi" ? "text-green-600" : "text-amber-600"}`}>
                                 {student.payment_status}
                               </span>
                             </div>
                             <div className="text-xs text-gray-500">
                               {student.payment_plan}
                             </div>
                           </>
                         )}
                         
                         {canRegister && <div className="flex gap-2 mt-2">
                           <Button variant="outline" size="sm" onClick={() => {
                             setEditingStudent(student);
                             setIsFormOpen(true);
                           }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                           </Button>
                           
                           {canManage && <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                  <span className="sr-only">Menü</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  setEditingStudent(student);
                                  setIsFormOpen(true);
                                }}>
                                  <Edit className="mr-2 h-4 w-4" /> Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(student)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Kaydı Sil / İptal Et
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>}
                         </div>}
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

          {/* Delete/Status Change Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Öğrenci Kaydı İşlemi</AlertDialogTitle>
                <AlertDialogDescription>
                  {studentToDelete?.name} isimli öğrenci için işlem nedenini seçiniz.
                  Bu işlem öğrenciyi listeden kaldıracak ancak verileri saklayacaktır.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="py-4">
                <RadioGroup value={deleteReason} onValueChange={(v) => setDeleteReason(v as any)}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="Kayıt İptali" id="r1" />
                    <Label htmlFor="r1">Kayıt İptali (Veli İsteği)</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="Ara Veriyor" id="r2" />
                    <Label htmlFor="r2">Ara Veriyor (Geçici Dondurma)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yönetim Sildi" id="r3" />
                    <Label htmlFor="r3">Yönetim Tarafından Silindi (Disiplin vb.)</Label>
                  </div>
                </RadioGroup>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                  Onayla ve Uygula
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

export default function StudentsPage() {
  return (
    <RoleGate level="staff">
      <StudentsPageInner />
    </RoleGate>
  );
}
