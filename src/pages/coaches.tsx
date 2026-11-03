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
import { Search, Plus, Phone, Mail, UserCircle, Award, Calendar, Loader2, Trash2, Edit } from "lucide-react";
import { coachService } from "@/services/coachService";
import { CoachForm } from "@/components/coaches/CoachForm";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Coach = Tables<"coaches">;

function CoachesPageInner() {
  const [searchTerm, setSearchTerm] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const { toast } = useToast();

  const { selectedBranchId, branches, getBranchName } = useBranch();
  // Antrenör girişi (ekleme, düzenleme, silme) yalnızca admin'e aittir
  const { isAdmin: canEditCoaches } = useUserRole();

  useEffect(() => {
    loadCoaches();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  const loadCoaches = async () => {
    try {
      setLoading(true);
      const data = await coachService.getAllCoaches(selectedBranchId);
      setCoaches(data);
    } catch (error) {
      console.error("Error loading coaches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await coachService.getCoachStats(selectedBranchId);
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleEdit = (coach: Coach) => {
    setSelectedCoach(coach);
    setIsFormOpen(true);
  };

  const handleDelete = (coach: Coach) => {
    setCoachToDelete(coach);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!coachToDelete) return;

    try {
      await coachService.deleteCoach(coachToDelete.id);
      toast({
        title: "Antrenör Silindi",
        description: `${coachToDelete.name} başarıyla pasif duruma getirildi.`,
      });
      loadCoaches();
      loadStats();
      setDeleteDialogOpen(false);
      setCoachToDelete(null);
    } catch (error) {
      console.error("Error deleting coach:", error);
      toast({
        title: "Hata",
        description: "Antrenör silinirken bir hata oluştu.",
        variant: "destructive"
      });
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

        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Antrenör Yönetimi</h1>
              <p className="text-gray-600 mt-1">Teknik kadro ve grup atamaları</p>
            </div>
            {canEditCoaches && (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Antrenör
              </Button>
            )}
          </div>

          <BranchFilterBar />

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4 sm:gap-6">
                      {/* Avatar */}
                      <div className="w-14 h-14 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0">
                        {coach.name.split(" ").map(n => n[0]).join("")}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{coach.name}</h3>
                              <Badge className="bg-emerald-100 text-emerald-800">
                                {coach.status}
                              </Badge>
                              {branches.length > 1 && (
                                <Badge variant="outline">{getBranchName(coach.branch_id)}</Badge>
                              )}
                              {branches.length > 1 && coach.branch_access === "all" && (
                                <Badge className="bg-blue-100 text-blue-800">Tüm şubeler</Badge>
                              )}
                            </div>
                            {coach.specialty && (
                              <p className="text-base sm:text-lg text-gray-600 font-medium">{coach.specialty}</p>
                            )}
                          </div>
                          {canEditCoaches && <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(coach)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(coach)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Sil
                            </Button>
                          </div>}
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
                                <span className="break-all">{coach.email}</span>
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
                {coaches.length === 0 && canEditCoaches && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsFormOpen(true)}>
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
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setSelectedCoach(undefined);
          }} 
          onSuccess={() => {
            loadCoaches();
            loadStats();
            setSelectedCoach(undefined);
          }}
          coach={selectedCoach}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Antrenörü Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {coachToDelete?.name} adlı antrenörü silmek istediğinizden emin misiniz? Bu işlem antrenörü pasif duruma getirecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default function CoachesPage() {
  return (
    <RoleGate level="management">
      <CoachesPageInner />
    </RoleGate>
  );
}
