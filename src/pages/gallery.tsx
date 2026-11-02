import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Send, Trash2, Download, Image as ImageIcon, Users } from "lucide-react";
import { storageService } from "@/services/storageService";
import { whatsappService } from "@/services/whatsappService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Row"];
type WhatsAppMedia = Database["public"]["Tables"]["whatsapp_media"]["Row"] & {
  students?: { name: string; father_phone: string | null; mother_phone: string | null };
};

export default function Gallery() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [media, setMedia] = useState<WhatsAppMedia[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load active students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .eq("status", "Aktif")
        .order("name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Load media gallery
      const { data: mediaData, error: mediaError } = await supabase
        .from("whatsapp_media")
        .select(`
          *,
          students (name, father_phone, mother_phone)
        `)
        .eq("media_type", "photo")
        .order("created_at", { ascending: false });

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen en az bir fotoğraf seçin",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const fileName = `photos/${Date.now()}_${file.name}`;
        const result = await storageService.uploadFile(file, fileName, "student-photos");

        if (result.success && result.url) {
          uploadedUrls.push(result.url);

          // Record in database
          await supabase.from("whatsapp_media").insert({
            media_type: "photo",
            media_url: result.url,
            caption: caption || "Antrenman fotoğrafı",
          });
        }
      }

      toast({
        title: "Başarılı",
        description: `${uploadedUrls.length} fotoğraf yüklendi`,
      });

      setSelectedFiles([]);
      setCaption("");
      loadData();
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast({
        title: "Hata",
        description: "Fotoğraflar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendPhotos = async (photoUrls: string[], studentIds: string[]) => {
    if (studentIds.length === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen en az bir öğrenci seçin",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      let successCount = 0;

      for (const studentId of studentIds) {
        const student = students.find((s) => s.id === studentId);
        if (!student) continue;

        const parentPhone = student.father_phone || student.mother_phone;
        if (!parentPhone) continue;

        for (const photoUrl of photoUrls) {
          try {
            await whatsappService.sendImageMessage(
              parentPhone,
              photoUrl,
              caption || `${student.name} - Antrenman fotoğrafı`
            );
            successCount++;
          } catch (error) {
            console.error(`Error sending to ${student.name}:`, error);
          }
        }
      }

      toast({
        title: "Başarılı",
        description: `${successCount} fotoğraf gönderildi`,
      });

      setSelectedStudents([]);
    } catch (error) {
      console.error("Error sending photos:", error);
      toast({
        title: "Hata",
        description: "Fotoğraflar gönderilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeletePhoto = async (mediaId: string, mediaUrl: string) => {
    try {
      // Delete from storage
      await storageService.deleteStudentPhoto(mediaUrl);

      // Delete from database
      await supabase.from("whatsapp_media").delete().eq("id", mediaId);

      toast({
        title: "Başarılı",
        description: "Fotoğraf silindi",
      });

      loadData();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Hata",
        description: "Fotoğraf silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <SEO 
        title="Fotoğraf Galerisi - FootballLab Futbol Okulu"
        description="Antrenman fotoğraflarını yönetin ve velilere gönderin"
      />
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-4 sm:py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Fotoğraf Galerisi
            </h1>
            <p className="text-gray-600">Antrenman fotoğraflarını yönetin ve velilere gönderin</p>
          </div>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" />
                Fotoğraf Yükle
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <ImageIcon className="w-4 h-4 mr-2" />
                Galeri
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Fotoğraf Yükle
                  </CardTitle>
                  <CardDescription>
                    Antrenman fotoğraflarını yükleyin ve velilere gönderin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="photos">Fotoğraflar Seç</Label>
                    <Input
                      id="photos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    {selectedFiles.length > 0 && (
                      <p className="text-sm text-gray-600">
                        {selectedFiles.length} fotoğraf seçildi
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="caption">Açıklama (Opsiyonel)</Label>
                    <Textarea
                      id="caption"
                      placeholder="Örn: 15 Mart 2024 Antrenman Fotoğrafları"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleUploadPhotos}
                    disabled={uploading || selectedFiles.length === 0}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Yükleniyor..." : "Fotoğrafları Yükle"}
                  </Button>

                  {/* Quick Send */}
                  {selectedFiles.length === 0 && media.length > 0 && (
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Hızlı Gönderim
                      </h3>
                      <p className="text-sm text-gray-600">
                        Son yüklenen fotoğrafları öğrencilere gönderin
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <Users className="w-4 h-4 mr-2" />
                            Öğrenci Seç ve Gönder
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Öğrenci Seçin</DialogTitle>
                            <DialogDescription>
                              Fotoğrafları göndermek istediğiniz öğrencileri seçin
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                              {students.map((student) => (
                                <div key={student.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={student.id}
                                    checked={selectedStudents.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedStudents([...selectedStudents, student.id]);
                                      } else {
                                        setSelectedStudents(selectedStudents.filter((id) => id !== student.id));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={student.id} className="cursor-pointer">
                                    {student.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => {
                                const recentPhotos = media.slice(0, 5).map((m) => m.media_url);
                                handleSendPhotos(recentPhotos, selectedStudents);
                              }}
                              disabled={sending || selectedStudents.length === 0}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {sending ? "Gönderiliyor..." : `${selectedStudents.length} Öğrenciye Gönder`}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Fotoğraf Galerisi
                  </CardTitle>
                  <CardDescription>
                    Yüklenen tüm fotoğrafları görüntüleyin ve yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {media.length === 0 ? (
                    <div className="text-center py-12">
                      <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Henüz fotoğraf yüklenmemiş</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {media.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                          <div className="aspect-video relative bg-gray-100">
                            <img
                              src={item.media_url}
                              alt={item.caption || "Antrenman fotoğrafı"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <p className="text-sm font-medium line-clamp-2">
                              {item.caption || "Açıklama yok"}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {new Date(item.created_at).toLocaleDateString("tr-TR")}
                              </span>
                              {item.students && (
                                <Badge variant="secondary">{item.students.name}</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.open(item.media_url, "_blank")}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                İndir
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeletePhoto(item.id, item.media_url)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}