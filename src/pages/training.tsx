import { SEO } from "@/components/SEO";
import { RoleGate } from "@/components/RoleGate";
import { Navigation } from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgePrograms } from "@/components/training/AgePrograms";
import { DrillLibrary } from "@/components/training/DrillLibrary";

function TrainingPageInner() {
  return (
    <>
      <SEO title="Antrenman Programları - FootbalLab" />
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Antrenman Programları</h1>
            <p className="mt-1 text-gray-600">6–16 yaş · haftada Cumartesi 1 saat, Pazar 1 saat · konu başlıklarına basarak sahada kullanacağınız planı görün</p>
          </div>
          <Tabs defaultValue="programs" className="space-y-6">
            <TabsList>
              <TabsTrigger value="programs">Yaş Programları</TabsTrigger>
              <TabsTrigger value="library">Egzersiz Kütüphanesi</TabsTrigger>
            </TabsList>
            <TabsContent value="programs">
              <AgePrograms />
            </TabsContent>
            <TabsContent value="library">
              <DrillLibrary />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default function TrainingPage() {
  return (
    <RoleGate level="staff">
      <TrainingPageInner />
    </RoleGate>
  );
}
