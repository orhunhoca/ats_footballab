import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { performanceService } from "@/services/performanceService";
import { Save, X, FlaskConical, Plus } from "lucide-react";
import { TestProtocolDialog } from "@/components/performance/TestProtocolDialog";
import { skillColor } from "@/lib/testCatalog";
import type { Student } from "@/services/studentService";
import type { TestProtocol } from "@/services/settingsService";

interface PerformanceTestFormProps {
  student: Student;
  testProtocols: TestProtocol[];
  onSuccess: () => void;
  onCancel: () => void;
  /** Yeni test tanımlanınca test listesini yenilemek için */
  onProtocolsChanged?: () => void;
}

export function PerformanceTestForm({ student, testProtocols, onSuccess, onCancel, onProtocolsChanged }: PerformanceTestFormProps) {
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<TestProtocol | null>(null);
  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split("T")[0],
    result_value: "",
    notes: "",
  });

  const handleProtocolChange = (protocolId: string) => {
    const protocol = testProtocols.find(p => p.id === protocolId);
    setSelectedProtocol(protocol || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProtocol) {
      toast({
        title: "Hata",
        description: "Lütfen bir test protokolü seçin",
        variant: "destructive",
      });
      return;
    }

    if (!formData.result_value) {
      toast({
        title: "Hata",
        description: "Lütfen test sonucunu girin",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await performanceService.createPerformanceTest({
        student_id: student.id,
        test_protocol_id: selectedProtocol.id,
        test_date: formData.test_date,
        value: parseFloat(formData.result_value), // Changed from result_value to value
        notes: formData.notes || null,
        unit: selectedProtocol.unit, // Add unit for redundancy/display
      });

      toast({
        title: "Başarılı",
        description: "Performans testi kaydedildi",
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving performance test:", error);
      toast({
        title: "Hata",
        description: "Test kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = skillColor;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle>Yeni Performans Testi</CardTitle>
            <CardDescription>
              {student.name} için test sonucu kaydet
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Test Protocol Selection */}
          <div className="space-y-2">
            <Label htmlFor="test-protocol">Test Protokolü *</Label>
            <Select value={selectedProtocol?.id ?? ""} onValueChange={(v) => v && handleProtocolChange(v)}>
              <SelectTrigger id="test-protocol">
                <SelectValue placeholder="Test seçin..." />
              </SelectTrigger>
              <SelectContent>
                {testProtocols.map((protocol) => (
                  <SelectItem key={protocol.id} value={protocol.id}>
                    <div className="flex items-center gap-2">
                      <span>{protocol.name}</span>
                      <Badge className={getCategoryColor(protocol.category)} variant="secondary">
                        {protocol.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-emerald-700" onClick={() => setProtocolDialogOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Listede yok mu? Yeni test tanımla
            </Button>
            {selectedProtocol && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Badge className={getCategoryColor(selectedProtocol.category)}>
                    {selectedProtocol.category}
                  </Badge>
                  <span className="text-slate-600 dark:text-slate-400">
                    Ölçüm Birimi: <strong>{selectedProtocol.unit}</strong>
                  </span>
                </div>
                {selectedProtocol.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    {selectedProtocol.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Test Date */}
          <div className="space-y-2">
            <Label htmlFor="test-date">Test Tarihi *</Label>
            <Input
              id="test-date"
              type="date"
              value={formData.test_date}
              onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
              required
            />
          </div>

          {/* Result Value */}
          <div className="space-y-2">
            <Label htmlFor="result-value">
              Sonuç * {selectedProtocol && `(${selectedProtocol.unit})`}
            </Label>
            <Input
              id="result-value"
              type="number"
              step="0.01"
              placeholder={selectedProtocol ? `Örn: 15.2 ${selectedProtocol.unit}` : "Önce test seçin"}
              value={formData.result_value}
              onChange={(e) => setFormData({ ...formData, result_value: e.target.value })}
              disabled={!selectedProtocol}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
            <Textarea
              id="notes"
              placeholder="Test hakkında notlar..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              İptal
            </Button>
            <Button type="submit" disabled={loading || !selectedProtocol}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </CardContent>
      <TestProtocolDialog
        open={protocolDialogOpen}
        onOpenChange={setProtocolDialogOpen}
        onSaved={(p) => {
          setSelectedProtocol(p);
          onProtocolsChanged?.();
        }}
      />
    </Card>
  );
}