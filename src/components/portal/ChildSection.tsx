import { Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MyChild } from "@/services/parentService";
import { ChildLedgerCard } from "./ChildLedgerCard";
import { ChildAttendanceCard } from "./ChildAttendanceCard";
import { ChildPerformanceCard } from "./ChildPerformanceCard";
import { ChildGalleryCard } from "./ChildGalleryCard";

/** Bir çocuk için sekmeli görünüm: yoklama, performans, galeri, ödeme. */
export function ChildSection({ child, userId }: { child: MyChild; userId: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{child.name}</span>
          {child.relation && <Badge variant="outline">{child.relation}</Badge>}
        </CardTitle>
        <div className="space-y-1 text-sm text-gray-700">
          {child.branch_name && (
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              {child.branch_name}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            {child.groups.length > 0 ? child.groups.join(", ") : "Grup atanmadı"}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attendance">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">Yoklama</TabsTrigger>
            <TabsTrigger value="performance">Performans</TabsTrigger>
            <TabsTrigger value="gallery">Galeri</TabsTrigger>
            <TabsTrigger value="payment">Ödeme</TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="pt-3">
            <ChildAttendanceCard studentId={child.student_id} />
          </TabsContent>
          <TabsContent value="performance" className="pt-3">
            <ChildPerformanceCard studentId={child.student_id} />
          </TabsContent>
          <TabsContent value="gallery" className="pt-3">
            <ChildGalleryCard studentId={child.student_id} userId={userId} />
          </TabsContent>
          <TabsContent value="payment" className="pt-3">
            <ChildLedgerCard studentId={child.student_id} studentName={child.name} embedded />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
