import { SEO } from "@/components/SEO";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Circle, Calendar, Users, ClipboardCheck } from "lucide-react";

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGroup, setSelectedGroup] = useState("all");

  // Mock data
  const groups = ["Tümü", "U13 - Yeşil Takım", "U12 - Mavi Takım", "U14 - Kırmızı Takım", "U11 - Sarı Takım"];
  
  const attendanceData = [
    { id: 1, name: "Ahmet Yılmaz", group: "U13 - Yeşil Takım", status: "present" },
    { id: 2, name: "Mehmet Demir", group: "U12 - Mavi Takım", status: "present" },
    { id: 3, name: "Can Öztürk", group: "U14 - Kırmızı Takım", status: "absent" },
    { id: 4, name: "Ege Kaya", group: "U11 - Sarı Takım", status: "present" },
    { id: 5, name: "Burak Şahin", group: "U13 - Yeşil Takım", status: null },
    { id: 6, name: "Eren Aydın", group: "U14 - Kırmızı Takım", status: "present" },
  ];

  const toggleAttendance = (studentId: number) => {
    console.log("Toggle attendance for student:", studentId);
  };

  const presentCount = attendanceData.filter(s => s.status === "present").length;
  const absentCount = attendanceData.filter(s => s.status === "absent").length;
  const notMarkedCount = attendanceData.filter(s => s.status === null).length;

  return (
    <>
      <SEO title="Yoklama - Futbol Okulu" />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Yoklama</h1>
                <p className="text-gray-600 mt-1">Günlük devam takibi ve kayıt</p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Yoklamayı Kaydet
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Date and Group Selector */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Tarih Seçin
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Grup Seçin
                  </label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Grup seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="u13">U13 - Yeşil Takım</SelectItem>
                      <SelectItem value="u12">U12 - Mavi Takım</SelectItem>
                      <SelectItem value="u14">U14 - Kırmızı Takım</SelectItem>
                      <SelectItem value="u11">U11 - Sarı Takım</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="text-3xl font-bold text-gray-900">{attendanceData.length}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-700">Gelen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{presentCount}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700">Gelmeyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{absentCount}</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-700">İşaretlenmedi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{notMarkedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <CardTitle>Öğrenci Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceData.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {student.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.group}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {student.status === "present" && (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Geldi
                        </Badge>
                      )}
                      {student.status === "absent" && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                          <XCircle className="w-4 h-4 mr-1" />
                          Gelmedi
                        </Badge>
                      )}
                      {student.status === null && (
                        <Badge variant="outline">
                          <Circle className="w-4 h-4 mr-1" />
                          İşaretlenmedi
                        </Badge>
                      )}
                      
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant={student.status === "present" ? "default" : "outline"}
                          onClick={() => toggleAttendance(student.id)}
                          className={student.status === "present" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={student.status === "absent" ? "default" : "outline"}
                          onClick={() => toggleAttendance(student.id)}
                          className={student.status === "absent" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Input({ type, value, onChange, className }: any) {
  return <input type={type} value={value} onChange={onChange} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`} />;
}