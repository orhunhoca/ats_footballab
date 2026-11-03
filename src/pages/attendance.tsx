import { SEO } from "@/components/SEO";
import { RoleGate } from "@/components/RoleGate";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Users, FileSpreadsheet, MessageCircle } from "lucide-react";
import { SendAttendanceNotificationDialog } from "@/components/attendance/SendAttendanceNotificationDialog";
import { useState, useEffect } from "react";
import { attendanceService } from "@/services/attendanceService";
import { groupService } from "@/services/groupService";
import { excelService } from "@/services/excelService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;
type Student = Tables<"students">;

function AttendancePageInner() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();
  const { isManagement } = useUserRole();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);

  // Şube değişince grupları yenile ve seçili grubu sıfırla
  useEffect(() => {
    setSelectedGroup("");
    setStudents([]);
    setAttendance({});
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // Load students when group changes
  useEffect(() => {
    if (selectedGroup) {
      loadStudents();
      loadAttendance();
    }
  }, [selectedGroup, date]);

  const loadGroups = async () => {
    try {
      const data = await groupService.getAllGroups(selectedBranchId);
      setGroups(data);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Gruplar yüklenirken bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      
      // Query students through student_groups junction table
      const { data, error } = await supabase
        .from("student_groups")
        .select(`
          student_id,
          students (
            id,
            name,
            age,
            phone,
            mother_name,
            mother_phone,
            father_name,
            father_phone,
            created_at,
            updated_at
          )
        `)
        .eq("group_id", selectedGroup);

      if (error) {
        console.error("Error loading students:", error);
        throw error;
      }

      // Extract student objects from the junction table results
      const studentList = data
        ?.map(item => item.students)
        .filter((s): s is Student => s !== null) || [];
      
      setStudents(studentList);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Hata",
        description: "Öğrenciler yüklenirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const records = await attendanceService.getAttendanceByDate(dateStr, selectedGroup);
      
      const attendanceMap: Record<string, boolean> = {};
      records.forEach(record => {
        attendanceMap[record.student_id] = record.status === 'present';
      });
      
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSave = async () => {
    if (!selectedGroup) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir grup seçin",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const dateStr = date.toISOString().split('T')[0];

      // Delete existing attendance records for this date and group
      const { error: deleteError } = await supabase
        .from("attendance")
        .delete()
        .eq("attendance_date", dateStr)
        .eq("group_id", selectedGroup);

      if (deleteError) {
        console.error("Error deleting old attendance:", deleteError);
        throw deleteError;
      }

      // Create new attendance records
      const attendanceRecords = students.map(student => ({
        student_id: student.id,
        group_id: selectedGroup,
        attendance_date: dateStr,
        status: attendance[student.id] ? 'present' : 'absent',
        notes: ""
      }));

      if (attendanceRecords.length > 0) {
        await attendanceService.bulkMarkAttendance(attendanceRecords);
      }

      toast({
        title: "Başarılı",
        description: "Yoklama kaydedildi"
      });

      loadAttendance();
    } catch (error) {
      console.error(error);
      toast({
        title: "Hata",
        description: "Yoklama kaydedilirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportAttendanceList = async () => {
    if (!selectedGroup) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir grup seçin",
        variant: "destructive"
      });
      return;
    }

    try {
      const dateStr = date.toISOString().split('T')[0];
      const records = await attendanceService.getAttendanceByDate(dateStr, selectedGroup);
      
      const groupName = groups.find(g => g.id === selectedGroup)?.name || "Grup";
      
      const excelData = records.map(record => ({
        date: new Date(record.attendance_date).toLocaleDateString("tr-TR"),
        studentName: students.find(s => s.id === record.student_id)?.name || "-",
        groupName: groupName,
        status: record.status,
      }));

      const blob = await excelService.generateAttendanceListExcel(
        excelData,
        groupName,
        date.toLocaleDateString("tr-TR")
      );

      excelService.downloadBlob(
        blob,
        `Yoklama_Listesi_${groupName}_${date.toLocaleDateString("tr-TR").replace(/\./g, "-")}.xlsx`
      );

      toast({
        title: "Excel İndirildi",
        description: "Yoklama listesi başarıyla oluşturuldu.",
      });
    } catch (error) {
      console.error("Error exporting attendance list:", error);
      toast({
        title: "Hata",
        description: "Excel oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleExportAttendanceReport = async () => {
    if (!selectedGroup) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir grup seçin",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get attendance records for the selected month
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const { data: monthRecords, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("group_id", selectedGroup)
        .gte("attendance_date", startOfMonth.toISOString().split('T')[0])
        .lte("attendance_date", endOfMonth.toISOString().split('T')[0]);

      if (error) throw error;

      // Calculate statistics per student
      const studentStats = students.map(student => {
        const studentRecords = monthRecords?.filter(r => r.student_id === student.id) || [];
        const presentDays = studentRecords.filter(r => r.status === 'present').length;
        const totalDays = studentRecords.length;
        const absentDays = totalDays - presentDays;
        const attendanceRate = totalDays > 0 
          ? `%${((presentDays / totalDays) * 100).toFixed(1)}`
          : "%0";

        return {
          studentName: student.name,
          totalDays,
          presentDays,
          absentDays,
          attendanceRate,
        };
      });

      const dateRange = `${startOfMonth.toLocaleDateString("tr-TR")} - ${endOfMonth.toLocaleDateString("tr-TR")}`;
      
      const blob = await excelService.generateAttendanceReportExcel(studentStats, dateRange);

      const groupName = groups.find(g => g.id === selectedGroup)?.name || "Grup";
      excelService.downloadBlob(
        blob,
        `Yoklama_Raporu_${groupName}_${date.getMonth() + 1}-${date.getFullYear()}.xlsx`
      );

      toast({
        title: "Excel İndirildi",
        description: "Yoklama raporu başarıyla oluşturuldu.",
      });
    } catch (error) {
      console.error("Error exporting attendance report:", error);
      toast({
        title: "Hata",
        description: "Rapor oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: students.length,
    present: Object.values(attendance).filter(v => v).length,
    absent: students.length - Object.values(attendance).filter(v => v).length
  };

  return (
    <>
      <SEO 
        title="Yoklama | FootbalLab Futbol Okulu"
        description="Öğrenci yoklama sistemi"
      />
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 pt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Yoklama Sistemi
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Öğrenci devam durumunu kaydedin
            </p>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleExportAttendanceList}
                disabled={!selectedGroup || students.length === 0}
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Günlük Liste (Excel)
              </Button>
              <Button 
                onClick={handleExportAttendanceReport}
                disabled={!selectedGroup || students.length === 0}
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Aylık Rapor (Excel)
              </Button>
            </div>
          </div>

          <div className="grid gap-6 mb-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Öğrenci</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Geldi</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gelmedi</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Tarih ve Grup Seçimi</CardTitle>
                <CardDescription>Yoklama almak için tarih ve grup seçin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tarih</label>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Grup</label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Grup seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Öğrenci Listesi</CardTitle>
                <CardDescription>
                  {date.toLocaleDateString('tr-TR')} - {groups.find(g => g.id === selectedGroup)?.name || "Grup seçilmedi"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedGroup ? (
                  <p className="text-center text-gray-500 py-8">Lütfen bir grup seçin</p>
                ) : loading ? (
                  <p className="text-center text-gray-500 py-8">Yükleniyor...</p>
                ) : students.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Bu grupta öğrenci bulunmuyor</p>
                ) : (
                  <div className="space-y-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-500">Yaş: {student.age}</p>
                          </div>
                        </div>
                        <Button
                          variant={attendance[student.id] ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleAttendance(student.id)}
                          className={attendance[student.id] ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {attendance[student.id] ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Geldi
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Gelmedi
                            </>
                          )}
                        </Button>
                      </div>
                    ))}

                    <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      {isManagement && <Button
                        variant="outline"
                        onClick={() => setIsNotifyOpen(true)}
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Velilere Bildir
                      </Button>}
                      <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-gradient-to-r from-green-600 to-blue-600"
                      >
                        {saving ? "Kaydediliyor..." : "Yoklamayı Kaydet"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <SendAttendanceNotificationDialog
        open={isNotifyOpen}
        onOpenChange={setIsNotifyOpen}
        date={date}
        groupName={groups.find((g) => g.id === selectedGroup)?.name || ""}
        students={students}
        attendance={attendance}
      />
    </>
  );
}

export default function AttendancePage() {
  return (
    <RoleGate level="staff">
      <AttendancePageInner />
    </RoleGate>
  );
}
