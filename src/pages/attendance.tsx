import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { attendanceService } from "@/services/attendanceService";
import { groupService } from "@/services/groupService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;
type Student = Tables<"students">;

export default function AttendancePage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load groups
  useEffect(() => {
    loadGroups();
  }, []);

  // Load students when group changes
  useEffect(() => {
    if (selectedGroup) {
      loadStudents();
      loadAttendance();
    }
  }, [selectedGroup, date]);

  const loadGroups = async () => {
    try {
      const data = await groupService.getAllGroups();
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
            first_name,
            last_name,
            age,
            phone,
            parent_phone,
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

  const stats = {
    total: students.length,
    present: Object.values(attendance).filter(v => v).length,
    absent: students.length - Object.values(attendance).filter(v => v).length
  };

  return (
    <>
      <SEO 
        title="Yoklama | Sportex Futbol Okulu"
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
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                            {student.first_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{student.first_name} {student.last_name}</p>
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

                    <div className="pt-4 flex justify-end">
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
    </>
  );
}