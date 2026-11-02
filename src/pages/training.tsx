import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAllTrainingPrograms, createTrainingProgram, addExerciseToProgram, type TrainingCategory, type DifficultyLevel } from "@/services/trainingService";
import { Dumbbell, Plus, Clock, Users, Target, Loader2, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function TrainingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory | "all">("all");
  const [formData, setFormData] = useState({
    name: "",
    category: "technical" as TrainingCategory,
    week_number: "",
    session_number: "",
    difficulty_level: "intermediate" as DifficultyLevel,
    duration_minutes: "",
    description: ""
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      setLoading(true);
      const data = await getAllTrainingPrograms();
      setPrograms(data);
    } catch (error) {
      console.error("Error loading programs:", error);
      toast({
        title: "Hata",
        description: "Programlar yüklenirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.category || !formData.duration_minutes) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen zorunlu alanları doldurun",
        variant: "destructive"
      });
      return;
    }

    try {
      await createTrainingProgram({
        name: formData.name,
        category: formData.category,
        week_number: formData.week_number ? parseInt(formData.week_number) : undefined,
        session_number: formData.session_number ? parseInt(formData.session_number) : undefined,
        difficulty_level: formData.difficulty_level,
        duration_minutes: parseInt(formData.duration_minutes),
        description: formData.description || undefined
      });

      toast({
        title: "Başarılı",
        description: "Antrenman programı oluşturuldu"
      });

      setIsDialogOpen(false);
      setFormData({
        name: "",
        category: "technical",
        week_number: "",
        session_number: "",
        difficulty_level: "intermediate",
        duration_minutes: "",
        description: ""
      });
      loadPrograms();
    } catch (error) {
      console.error("Error creating program:", error);
      toast({
        title: "Hata",
        description: "Program oluşturulurken bir hata oluştu",
        variant: "destructive"
      });
    }
  }

  function getCategoryLabel(category: TrainingCategory) {
    const labels: Record<TrainingCategory, string> = {
      defense: "Savunma",
      offense: "Hücum",
      coordination: "Koordinasyon",
      transitions: "Alan Geçişi",
      technical: "Teknik",
      conditioning: "Kondisyon",
      tactical: "Taktik"
    };
    return labels[category];
  }

  function getCategoryColor(category: TrainingCategory) {
    const colors: Record<TrainingCategory, string> = {
      defense: "bg-blue-100 text-blue-800",
      offense: "bg-red-100 text-red-800",
      coordination: "bg-purple-100 text-purple-800",
      transitions: "bg-orange-100 text-orange-800",
      technical: "bg-green-100 text-green-800",
      conditioning: "bg-yellow-100 text-yellow-800",
      tactical: "bg-indigo-100 text-indigo-800"
    };
    return colors[category];
  }

  function getDifficultyLabel(level: DifficultyLevel) {
    const labels: Record<DifficultyLevel, string> = {
      beginner: "Başlangıç",
      intermediate: "Orta",
      advanced: "İleri"
    };
    return labels[level];
  }

  const filteredPrograms = selectedCategory === "all" 
    ? programs 
    : programs.filter(p => p.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <SEO title="Antrenman Programları - FootballLab" description="Antrenman programları ve egzersiz yönetimi" />
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <SEO title="Antrenman Programları - FootballLab" description="Antrenman programları ve egzersiz yönetimi" />
      <Navigation />
      
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Antrenman Programları</h1>
            <p className="text-gray-600">Haftalık antrenman planları ve egzersizler</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Program
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yeni Antrenman Programı</DialogTitle>
                  <DialogDescription>Haftalık antrenman planı oluşturun</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Program Adı *</Label>
                    <Input
                      id="name"
                      placeholder="örn: Savunma Prensipleri - Pressing"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: TrainingCategory) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="defense">Savunma</SelectItem>
                          <SelectItem value="offense">Hücum</SelectItem>
                          <SelectItem value="coordination">Koordinasyon</SelectItem>
                          <SelectItem value="transitions">Alan Geçişi</SelectItem>
                          <SelectItem value="technical">Teknik</SelectItem>
                          <SelectItem value="conditioning">Kondisyon</SelectItem>
                          <SelectItem value="tactical">Taktik</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="difficulty">Seviye *</Label>
                      <Select
                        value={formData.difficulty_level}
                        onValueChange={(value: DifficultyLevel) => setFormData({ ...formData, difficulty_level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Başlangıç</SelectItem>
                          <SelectItem value="intermediate">Orta</SelectItem>
                          <SelectItem value="advanced">İleri</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="week">Hafta</Label>
                      <Input
                        id="week"
                        type="number"
                        placeholder="1"
                        value={formData.week_number}
                        onChange={(e) => setFormData({ ...formData, week_number: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="session">Seans</Label>
                      <Input
                        id="session"
                        type="number"
                        placeholder="1"
                        value={formData.session_number}
                        onChange={(e) => setFormData({ ...formData, session_number: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="duration">Süre (dk) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="90"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      placeholder="Program hedefleri ve detayları..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Program Oluştur
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Program</CardTitle>
              <Dumbbell className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Hafta</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {programs.filter(p => p.week_number === Math.ceil(Date.now() / (7 * 24 * 60 * 60 * 1000))).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kategoriler</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(programs.map(p => p.category)).size}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Süre</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {programs.length > 0 
                  ? Math.round(programs.reduce((sum, p) => sum + p.duration_minutes, 0) / programs.length)
                  : 0} dk
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TrainingCategory | "all")} className="mb-6">
          <TabsList className="flex w-full justify-start">
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="defense">Savunma</TabsTrigger>
            <TabsTrigger value="offense">Hücum</TabsTrigger>
            <TabsTrigger value="coordination">Koordinasyon</TabsTrigger>
            <TabsTrigger value="transitions">Alan Geçişi</TabsTrigger>
            <TabsTrigger value="technical">Teknik</TabsTrigger>
            <TabsTrigger value="conditioning">Kondisyon</TabsTrigger>
            <TabsTrigger value="tactical">Taktik</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Programs List */}
        {filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Henüz program bulunmuyor</p>
              <p className="text-gray-400 text-sm mb-4">Yeni bir antrenman programı oluşturarak başlayın</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                İlk Programı Oluştur
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPrograms.map((program) => (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{program.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={getCategoryColor(program.category)}>
                          {getCategoryLabel(program.category)}
                        </Badge>
                        <Badge variant="outline">
                          {getDifficultyLabel(program.difficulty_level)}
                        </Badge>
                        {program.week_number && (
                          <Badge variant="outline">Hafta {program.week_number}</Badge>
                        )}
                        {program.session_number && (
                          <Badge variant="outline">Seans {program.session_number}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{program.duration_minutes} dk</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {program.description && (
                    <p className="text-gray-600 text-sm mb-4">{program.description}</p>
                  )}
                  
                  {program.training_exercises && program.training_exercises.length > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="exercises">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Egzersizler ({program.training_exercises.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {program.training_exercises
                              .sort((a: any, b: any) => a.order_number - b.order_number)
                              .map((exercise: any) => (
                                <div key={exercise.id} className="border-l-4 border-green-500 pl-4 py-2">
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="font-medium text-sm">{exercise.exercise_name}</p>
                                    <span className="text-xs text-gray-500">{exercise.duration_minutes} dk</span>
                                  </div>
                                  {exercise.instructions && (
                                    <p className="text-xs text-gray-600 mb-2">{exercise.instructions}</p>
                                  )}
                                  {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {exercise.equipment_needed.map((item: string, idx: number) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {item}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}