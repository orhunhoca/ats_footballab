import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { useBranch } from "@/contexts/BranchContext";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, TrendingUp, UserCircle, Clock, Loader2, Phone, Mail, Pencil, Trash2 } from "lucide-react";
import { groupService } from "@/services/groupService";
import { GroupForm } from "@/components/groups/GroupForm";
import { AssignStudentsDialog } from "@/components/groups/AssignStudentsDialog";
import { fieldService, formatFieldHours, type BranchField } from "@/services/fieldService";
import { studentService } from "@/services/studentService";
import { formatSession, isFull, occupied, remaining, sortSessions, type Occupancy, type Session } from "@/lib/groupRules";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, UserPlus, UserMinus, LayoutGrid } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups"> & {
  student_count?: number;
  students?: Tables<"students">[];
  coaches?: Tables<"coaches"> | null;
};

function GroupsPageInner() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    group: Group;
    blockers: { students: number; attendance: number; trialStudents: number };
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [occupancy, setOccupancy] = useState<Record<string, Occupancy>>({});
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [fieldMap, setFieldMap] = useState<Record<string, BranchField>>({});
  const [assignGroup, setAssignGroup] = useState<Group | null>(null);
  const { toast } = useToast();

  const { selectedBranchId, branches, getBranchName } = useBranch();

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const [data, occ, sess, fields] = await Promise.all([
        groupService.getAllGroups(selectedBranchId),
        groupService.getOccupancy().catch(() => ({} as Record<string, Occupancy>)),
        groupService.getAllSessions().catch(() => ({} as Record<string, Session[]>)),
        fieldService.list().catch(() => [] as BranchField[]),
      ]);
      setGroups(data);
      setOccupancy(occ);
      setSessions(sess);
      setFieldMap(Object.fromEntries(fields.map((f) => [f.id, f])));
      // Açık öğrenci listesi güncel kalsın
      setSelectedGroup((prev) => (prev ? data.find((g) => g.id === prev.id) ?? prev : prev));
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const openNewGroup = () => {
    setEditingGroup(null);
    setIsFormOpen(true);
  };

  const openEditGroup = (group: Group) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  // Silmeden önce bağlı kayıtlara bakılır; öğrenci/yoklama/deneme öğrencisi varsa silinemez
  const askDelete = async (group: Group) => {
    try {
      const blockers = await groupService.getDeleteBlockers(group.id);
      setDeleteTarget({ group, blockers });
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Grup bilgileri kontrol edilemedi.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await groupService.deleteGroup(deleteTarget.group.id);
      toast({ title: "Grup silindi", description: `${deleteTarget.group.name} silindi.` });
      setDeleteTarget(null);
      await loadGroups();
    } catch (error) {
      toast({ title: "Silinemedi", description: error instanceof Error ? error.message : "Grup silinemedi.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const deactivate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await groupService.updateGroup(deleteTarget.group.id, { status: "Pasif" });
      toast({ title: "Grup pasif yapıldı", description: `${deleteTarget.group.name} artık aktif grup sayılmaz; geçmiş kayıtlar korunur.` });
      setDeleteTarget(null);
      await loadGroups();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Grup güncellenemedi.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleShowStudents = (group: Group) => {
    setSelectedGroup(group);
    setIsStudentListOpen(true);
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
      const parsed = JSON.parse(schedule);
      return Array.isArray(parsed) ? parsed : [];
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

        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Grup Yönetimi</h1>
              <p className="text-gray-600 mt-1">Takımlar, program ve öğrenci atamaları</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openNewGroup}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Grup
            </Button>
          </div>

          <BranchFilterBar />

          {groups.some((g) => g.status === "Aktif" && isFull(occupancy[g.id])) && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Kontenjanı dolan gruplar:</strong>{" "}
                {groups
                  .filter((g) => g.status === "Aktif" && isFull(occupancy[g.id]))
                  .map((g) => g.name)
                  .join(", ")}
                . Bu gruplara yeni deneme öğrencisi alınamaz; başka bir saha/saat seçin ya da kontenjanı artırın.
              </AlertDescription>
            </Alert>
          )}

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
                const schedule: string[] = sessions[group.id]?.length ? sortSessions(sessions[group.id]).map(formatSession) : parseSchedule(group.schedule);
                const occ = occupancy[group.id];
                const full = isFull(occ);
                const left = remaining(occ);
                const field = group.field_id ? fieldMap[group.field_id] : undefined;
                const colorKey = (group.color || "emerald") as keyof typeof colorClasses;
                
                return (
                  <Card key={group.id} className="hover:shadow-lg transition-all border-2">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-gradient-to-br ${colorClasses[colorKey] || colorClasses.emerald} rounded-2xl flex items-center justify-center`}>
                            <Users className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl mb-1">{group.name}</CardTitle>
                            <p className="text-sm text-gray-600">
                              {group.age_group}
                              {branches.length > 1 && ` · ${getBranchName(group.branch_id)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditGroup(group)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Düzenle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => askDelete(group)}
                            aria-label={`${group.name} grubunu sil`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="info" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="info">Bilgiler</TabsTrigger>
                          <TabsTrigger value="schedule">Program</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="info" className="space-y-4 mt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Kontenjan</p>
                                <p className={`text-lg font-bold ${full ? "text-red-600" : "text-gray-900"}`}>
                                  {occ ? occupied(occ) : group.student_count || 0}
                                  {occ?.capacity != null ? ` / ${occ.capacity}` : ""}
                                </p>
                                {occ && occ.trial_pending > 0 && <p className="text-[11px] text-gray-500">{occ.enrolled} kayıtlı + {occ.trial_pending} deneme</p>}
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

                          <div className="pt-3 border-t space-y-1 text-sm">
                            <div>
                              <span className="text-gray-500">Antrenör:</span>
                              {group.coaches ? (
                                <span className="ml-2 font-medium">{group.coaches.name}</span>
                              ) : (
                                <span className="ml-2 font-medium text-red-600">atanmamış</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <LayoutGrid className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-gray-500">Saha:</span>
                              {field ? (
                                <span className="ml-1 font-medium">{field.name} <span className="font-normal text-gray-500">({formatFieldHours(field)})</span></span>
                              ) : (
                                <span className="ml-1 font-medium text-red-600">atanmamış</span>
                              )}
                            </div>
                            {full && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Kontenjan dolu</Badge>}
                            {!full && left != null && left <= 2 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Son {left} yer</Badge>}
                          </div>
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

                      <div className="mt-4 pt-4 border-t space-y-2">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={group.status !== "Aktif"} onClick={() => setAssignGroup(group)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Öğrenci Ata
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => handleShowStudents(group)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Öğrencileri Gör ({group.student_count || 0})
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
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openNewGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Grubu Oluştur
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Group Form Dialog */}
        <GroupForm 
          open={isFormOpen} 
          group={editingGroup}
          onOpenChange={(o) => {
            setIsFormOpen(o);
            if (!o) setEditingGroup(null);
          }} 
          onSuccess={() => {
            loadGroups();
          }} 
        />

        {/* Silme / pasif yapma onayı */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
          <AlertDialogContent>
            {deleteTarget && (deleteTarget.blockers.students > 0 || deleteTarget.blockers.attendance > 0 || deleteTarget.blockers.trialStudents > 0) ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{deleteTarget.group.name} silinemez</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm">
                      <p>Bu gruba bağlı kayıtlar var; silinirse yoklama geçmişi de kaybolur:</p>
                      <ul className="list-disc pl-5">
                        {deleteTarget.blockers.students > 0 && <li>{deleteTarget.blockers.students} öğrenci</li>}
                        {deleteTarget.blockers.attendance > 0 && <li>{deleteTarget.blockers.attendance} yoklama kaydı</li>}
                        {deleteTarget.blockers.trialStudents > 0 && <li>{deleteTarget.blockers.trialStudents} deneme öğrencisi</li>}
                      </ul>
                      <p>Önce öğrencileri başka bir gruba taşıyın. Grubu kullanmayacaksanız silmek yerine <strong>Pasif</strong> yapabilirsiniz; geçmiş kayıtlar korunur.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
                  {deleteTarget.group.status !== "Pasif" && (
                    <AlertDialogAction onClick={(e) => { e.preventDefault(); deactivate(); }} disabled={deleting}>
                      {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Grubu Pasif Yap
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Grubu sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteTarget?.group.name} grubu ve haftalık programı kalıcı olarak silinecek. Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>

        <AssignStudentsDialog
          open={!!assignGroup}
          onOpenChange={(o) => !o && setAssignGroup(null)}
          group={assignGroup}
          occupancy={assignGroup ? occupancy[assignGroup.id] : undefined}
          onChanged={loadGroups}
        />

        {/* Student List Dialog */}
        <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {selectedGroup?.name} - Öğrenci Listesi
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {selectedGroup && selectedGroup.students && selectedGroup.students.length > 0 ? (
                selectedGroup.students.map((student) => (
                  <Card key={student.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{student.name}</h4>
                          <p className="text-sm text-gray-600">Doğum Tarihi: {student.birth_date ? new Date(student.birth_date).toLocaleDateString("tr-TR") : "-"}</p>
                          {student.father_phone && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                              <Phone className="w-3 h-3" />
                              <span>{student.father_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${student.name} öğrencisini gruptan çıkar`}
                          onClick={async () => {
                            try {
                              await studentService.removeFromGroup(student.id, selectedGroup.id);
                              toast({ title: "Gruptan çıkarıldı", description: student.name });
                              await loadGroups();
                            } catch {
                              toast({ title: "Hata", description: "Öğrenci gruptan çıkarılamadı.", variant: "destructive" });
                            }
                          }}
                        >
                          <UserMinus className="w-4 h-4 text-red-600" />
                        </Button>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          student.status === "Aktif" 
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {student.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Bu grupta henüz öğrenci bulunmuyor.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function GroupsPage() {
  return (
    <RoleGate level="management">
      <GroupsPageInner />
    </RoleGate>
  );
}
