import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigation } from "@/components/Navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, UserPlus, Clock, CheckCircle2, XCircle, Phone, Calendar } from "lucide-react";
import { trialStudentService } from "@/services/trialStudentService";
import { useToast } from "@/hooks/use-toast";
import { TrialStudentForm } from "@/components/trial/TrialStudentForm";
import { ConvertToStudentDialog } from "@/components/trial/ConvertToStudentDialog";
import type { Tables } from "@/integrations/supabase/types";

type TrialStudent = Tables<"trial_students"> & {
  groups?: Tables<"groups"> | null;
};

function TrialStudentsPageInner() {
  const [trialStudents, setTrialStudents] = useState<TrialStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<TrialStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    converted: 0,
    cancelled: 0
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<TrialStudent | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const { toast } = useToast();

  const { selectedBranchId, branches, getBranchName } = useBranch();
  // Kayda dönüştürme (ödeme planı içerir) ve silme yalnızca yönetime aittir; antrenör deneme kaydı ekler
  const { isManagement } = useUserRole();

  useEffect(() => {
    loadTrialStudents();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = trialStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parent_phone.includes(searchTerm)
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(trialStudents);
    }
  }, [searchTerm, trialStudents]);

  const loadTrialStudents = async () => {
    try {
      setLoading(true);
      const data = await trialStudentService.getAllTrialStudents(selectedBranchId);
      setTrialStudents(data);
      setFilteredStudents(data);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Deneme öğrenciler yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await trialStudentService.getTrialStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu deneme öğrenciyi silmek istediğinize emin misiniz?")) return;

    try {
      await trialStudentService.deleteTrialStudent(id);
      toast({
        title: "Başarılı",
        description: "Deneme öğrenci silindi."
      });
      loadTrialStudents();
      loadStats();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Silme işlemi başarısız oldu.",
        variant: "destructive"
      });
    }
  };

  const handleConvert = (student: TrialStudent) => {
    setSelectedStudent(student);
    setIsConvertDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Beklemede":
        return <Badge variant="default" className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Beklemede</Badge>;
      case "Kayıt Oldu":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Kayıt Oldu</Badge>;
      case "Vazgeçti":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Vazgeçti</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <SEO title="Deneme Antrenmanları - FootbalLab Futbol Okulu" />
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Deneme Antrenmanları</h1>
              <p className="text-muted-foreground">
                Deneme antrenmanına gelen çocukları takip edin
              </p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Yeni Deneme Öğrenci
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Yeni Deneme Öğrenci Ekle</DialogTitle>
                  <DialogDescription>
                    Deneme antrenmanına katılacak öğrencinin bilgilerini girin
                  </DialogDescription>
                </DialogHeader>
                <TrialStudentForm
                  onSuccess={() => {
                    setIsFormOpen(false);
                    loadTrialStudents();
                    loadStats();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Deneme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-yellow-700">Beklemede</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">Kayıt Oldu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{stats.converted}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700">Vazgeçti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{stats.cancelled}</div>
              </CardContent>
            </Card>
          </div>

          <BranchFilterBar />

          {/* Search Bar */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Öğrenci adı, veli adı veya telefon ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Student List */}
          {loading ? (
            <div className="text-center py-12">Yükleniyor...</div>
          ) : filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchTerm ? "Arama sonucu bulunamadı." : "Henüz deneme öğrenci eklenmemiş."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{student.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {getStatusBadge(student.status || "Beklemede")}
                          {branches.length > 1 && (
                            <span className="ml-2 text-xs text-muted-foreground">{getBranchName(student.branch_id)}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Yaş Grubu: {student.age_group || "Belirtilmemiş"}</span>
                      </div>
                      {student.groups && (
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-muted-foreground" />
                          <span>Grup: {student.groups.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{student.parent_name}: {student.parent_phone}</span>
                      </div>
                      {student.trial_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Deneme: {new Date(student.trial_date).toLocaleDateString("tr-TR")}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {isManagement && student.status === "Beklemede" && (
                        <Button
                          onClick={() => handleConvert(student)}
                          className="flex-1 gap-2"
                          variant="default"
                        >
                          <UserPlus className="w-4 h-4" />
                          Kayıt Ol
                        </Button>
                      )}
                      {isManagement && (
                        <Button
                          onClick={() => handleDelete(student.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Sil
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Convert to Full Student Dialog */}
      {selectedStudent && (
        <ConvertToStudentDialog
          trialStudent={selectedStudent}
          open={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          onSuccess={() => {
            setIsConvertDialogOpen(false);
            setSelectedStudent(null);
            loadTrialStudents();
            loadStats();
          }}
        />
      )}
    </>
  );
}

export default function TrialStudentsPage() {
  return (
    <RoleGate level="staff">
      <TrialStudentsPageInner />
    </RoleGate>
  );
}
