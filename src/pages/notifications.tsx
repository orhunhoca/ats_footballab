import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Clock, DollarSign, FileText, Shirt, MessageCircle, Phone } from "lucide-react";
import { studentService } from "@/services/studentService";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

interface NotificationItem {
  student: Student;
  type: "expired" | "expiring_7" | "expiring_14" | "installment" | "health_report" | "clothing";
  priority: "high" | "medium" | "low";
  daysRemaining?: number;
  daysOverdue?: number;
  message: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    expired: 0,
    expiring_7: 0,
    expiring_14: 0,
    installment: 0,
    health_report: 0,
    clothing: 0
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const students = await studentService.getAllStudents();
      const today = new Date();
      const notificationsList: NotificationItem[] = [];

      students.forEach(student => {
        if (!student.membership_end_date) return;

        const endDate = new Date(student.membership_end_date);
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Üyelik bitti veya bugün bitiyor
        if (diffDays <= 0) {
          notificationsList.push({
            student,
            type: "expired",
            priority: "high",
            daysOverdue: Math.abs(diffDays),
            message: `${student.name} adlı öğrencinin üyeliği ${Math.abs(diffDays)} gün önce sona erdi. Lütfen yenileme için iletişime geçin.`
          });
        }
        // 7 gün içinde bitecek
        else if (diffDays > 0 && diffDays <= 7) {
          notificationsList.push({
            student,
            type: "expiring_7",
            priority: "high",
            daysRemaining: diffDays,
            message: `${student.name} adlı öğrencinin üyeliği ${diffDays} gün içinde sona erecek. Yenileme zamanı yaklaşıyor.`
          });
        }
        // 14 gün içinde bitecek
        else if (diffDays > 7 && diffDays <= 14) {
          notificationsList.push({
            student,
            type: "expiring_14",
            priority: "medium",
            daysRemaining: diffDays,
            message: `${student.name} adlı öğrencinin üyeliği ${diffDays} gün içinde sona erecek.`
          });
        }

        // Taksit ödemesi kontrolü
        if (student.payment_plan === "12 Aylık Taksitli" && !student.payment_status?.includes("second_paid")) {
          const registrationDate = new Date(student.created_at);
          const installmentDate = new Date(registrationDate);
          installmentDate.setDate(installmentDate.getDate() + 45);
          const installmentDiff = today.getTime() - installmentDate.getTime();
          const installmentDays = Math.ceil(installmentDiff / (1000 * 60 * 60 * 24));

          if (installmentDays >= 0) {
            notificationsList.push({
              student,
              type: "installment",
              priority: "high",
              daysOverdue: installmentDays,
              message: `${student.name} adlı öğrencinin 2. taksit ödemesi ${installmentDays} gün gecikmiş. Ödeme: 23.000 TL`
            });
          }
        }

        // Sağlık raporu kontrolü
        if (!student.health_report_submitted) {
          const registrationDate = new Date(student.created_at);
          const healthReportDeadline = new Date(registrationDate);
          healthReportDeadline.setDate(healthReportDeadline.getDate() + 10);
          const healthDiff = today.getTime() - healthReportDeadline.getTime();
          const healthDays = Math.ceil(healthDiff / (1000 * 60 * 60 * 24));

          if (healthDays >= 0) {
            notificationsList.push({
              student,
              type: "health_report",
              priority: "medium",
              daysOverdue: healthDays,
              message: `${student.name} adlı öğrenci sağlık raporu teslim etmedi. ${healthDays} gün gecikme var.`
            });
          }
        }

        // Kıyafet ödemesi kontrolü
        if (!student.clothing_payment_status || student.clothing_payment_status === "unpaid") {
          notificationsList.push({
            student,
            type: "clothing",
            priority: "low",
            message: `${student.name} adlı öğrencinin kıyafet ödemesi (3.000 TL) yapılmadı.`
          });
        }
      });

      // İstatistikleri güncelle
      setStats({
        expired: notificationsList.filter(n => n.type === "expired").length,
        expiring_7: notificationsList.filter(n => n.type === "expiring_7").length,
        expiring_14: notificationsList.filter(n => n.type === "expiring_14").length,
        installment: notificationsList.filter(n => n.type === "installment").length,
        health_report: notificationsList.filter(n => n.type === "health_report").length,
        clothing: notificationsList.filter(n => n.type === "clothing").length
      });

      setNotifications(notificationsList);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppLink = (notification: NotificationItem) => {
    const phone = (notification.student.mother_phone || notification.student.father_phone)?.replace(/\D/g, "");
    if (!phone) return "#";

    const message = encodeURIComponent(notification.message);
    return `https://wa.me/90${phone}?text=${message}`;
  };

  const getPhoneLink = (notification: NotificationItem) => {
    const phone = (notification.student.mother_phone || notification.student.father_phone)?.replace(/\D/g, "");
    if (!phone) return "#";
    return `tel:+90${phone}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "expired": return <AlertCircle className="h-5 w-5" />;
      case "expiring_7":
      case "expiring_14": return <Clock className="h-5 w-5" />;
      case "installment": return <DollarSign className="h-5 w-5" />;
      case "health_report": return <FileText className="h-5 w-5" />;
      case "clothing": return <Shirt className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "expired": return "Üyelik Bitti";
      case "expiring_7": return "7 Gün İçinde";
      case "expiring_14": return "14 Gün İçinde";
      case "installment": return "Taksit Ödemesi";
      case "health_report": return "Sağlık Raporu";
      case "clothing": return "Kıyafet Ödemesi";
      default: return "Bilinmeyen";
    }
  };

  const filterByType = (type: string) => {
    if (type === "all") return notifications;
    return notifications.filter(n => n.type === type);
  };

  const renderNotificationCard = (notification: NotificationItem) => (
    <Card key={`${notification.student.id}-${notification.type}`} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${notification.priority === "high" ? "bg-red-100 text-red-600" : notification.priority === "medium" ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-600"}`}>
              {getTypeIcon(notification.type)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{notification.student.name}</h3>
                <Badge variant={getPriorityColor(notification.priority)}>
                  {getTypeLabel(notification.type)}
                </Badge>
                {notification.daysRemaining && (
                  <Badge variant="outline">{notification.daysRemaining} gün kaldı</Badge>
                )}
                {notification.daysOverdue && (
                  <Badge variant="destructive">{notification.daysOverdue} gün gecikme</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {(notification.student.mother_name || notification.student.father_name) && (
                  <div className="flex flex-col gap-1">
                    {notification.student.mother_name && notification.student.mother_phone && (
                      <div>
                        <span>Anne: {notification.student.mother_name}</span>
                        <span className="ml-2">({notification.student.mother_phone})</span>
                      </div>
                    )}
                    {notification.student.father_name && notification.student.father_phone && (
                      <div>
                        <span>Baba: {notification.student.father_name}</span>
                        <span className="ml-2">({notification.student.father_phone})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {notification.student.mother_phone && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => {
                    window.open(`https://wa.me/90${notification.student.mother_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(notification.message)}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Anne WA
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `tel:${notification.student.mother_phone}`;
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Anne Ara
                </Button>
              </>
            )}
            {notification.student.father_phone && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => {
                    window.open(`https://wa.me/90${notification.student.father_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(notification.message)}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Baba WA
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `tel:${notification.student.father_phone}`;
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Baba Ara
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <SEO title="Bildirimler - Sportex Futbol Okulu" />
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Bildirimler ve Hatırlatıcılar</h1>
            <p className="text-muted-foreground">
              Üyelik yenileme, ödeme ve sağlık raporu hatırlatıcıları
            </p>
          </div>

          {/* İstatistik Kartları */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700">Üyelik Bitti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{stats.expired}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-700">7 Gün İçinde</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{stats.expiring_7}</div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-yellow-700">14 Gün İçinde</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{stats.expiring_14}</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700">Taksit Ödemesi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{stats.installment}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">Sağlık Raporu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{stats.health_report}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Kıyafet Ödemesi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700">{stats.clothing}</div>
              </CardContent>
            </Card>
          </div>

          {/* Bildirim Listesi */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tüm Bildirimler</CardTitle>
                  <CardDescription>
                    Toplam {notifications.length} bildirim
                  </CardDescription>
                </div>
                <Button onClick={loadNotifications} variant="outline">
                  Yenile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="all">
                    Tümü ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="expired">
                    Bitti ({stats.expired})
                  </TabsTrigger>
                  <TabsTrigger value="expiring_7">
                    7 Gün ({stats.expiring_7})
                  </TabsTrigger>
                  <TabsTrigger value="expiring_14">
                    14 Gün ({stats.expiring_14})
                  </TabsTrigger>
                  <TabsTrigger value="installment">
                    Taksit ({stats.installment})
                  </TabsTrigger>
                  <TabsTrigger value="health_report">
                    Rapor ({stats.health_report})
                  </TabsTrigger>
                  <TabsTrigger value="clothing">
                    Kıyafet ({stats.clothing})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  {loading ? (
                    <div className="text-center py-8">Yükleniyor...</div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Henüz bildirim yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="expired" className="mt-6">
                  {filterByType("expired").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Üyeliği biten öğrenci yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterByType("expired").map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="expiring_7" className="mt-6">
                  {filterByType("expiring_7").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      7 gün içinde bitecek üyelik yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterByType("expiring_7").map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="expiring_14" className="mt-6">
                  {filterByType("expiring_14").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      14 gün içinde bitecek üyelik yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterByType("expiring_14").map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="installment" className="mt-6">
                  {filterByType("installment").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Bekleyen taksit ödemesi yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterByType("installment").map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="health_report" className="mt-6">
                  {filterByType("health_report").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Bekleyen sağlık raporu yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterByType("health_report").map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="clothing" className="mt-6">
                  {filterByType("clothing").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Bekleyen kıyafet ödemesi yok
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterByType("clothing").map(renderNotificationCard)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}