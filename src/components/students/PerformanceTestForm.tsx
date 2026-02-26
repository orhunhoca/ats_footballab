import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  createPerformanceTest,
  TEST_TYPES,
  type PerformanceTestInsert,
} from "@/services/performanceService";
import { useToast } from "@/hooks/use-toast";

interface PerformanceTestFormProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PerformanceTestForm({
  studentId,
  studentName,
  open,
  onOpenChange,
  onSuccess,
}: PerformanceTestFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testDate, setTestDate] = useState<Date>(new Date());
  const [testType, setTestType] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const selectedTestInfo = testType ? TEST_TYPES[testType] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testType || !value) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const testData: PerformanceTestInsert = {
        student_id: studentId,
        test_date: format(testDate, "yyyy-MM-dd"),
        test_type: testType as any,
        value: parseFloat(value),
        unit: selectedTestInfo!.unit,
        notes: notes || null,
      };

      await createPerformanceTest(testData);

      toast({
        title: "Test Kaydedildi",
        description: "Performans testi başarıyla kaydedildi.",
      });

      // Reset form
      setTestType("");
      setValue("");
      setNotes("");
      setTestDate(new Date());

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving test:", error);
      toast({
        title: "Hata",
        description: "Test kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Performans Testi Ekle</DialogTitle>
          <DialogDescription>
            {studentName} için yeni performans testi kaydı oluşturun.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-date">Test Tarihi *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !testDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {testDate ? (
                    format(testDate, "PPP", { locale: tr })
                  ) : (
                    <span>Tarih seçin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={testDate}
                  onSelect={(date) => date && setTestDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-type">Test Türü *</Label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger>
                <SelectValue placeholder="Test türü seçin" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TEST_TYPES).map((test) => (
                  <SelectItem key={test.value} value={test.value}>
                    {test.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTestInfo && (
              <p className="text-sm text-muted-foreground">
                {selectedTestInfo.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              Sonuç {selectedTestInfo && `(${selectedTestInfo.unit})`} *
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selectedTestInfo?.unit || "Değer girin"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Test ile ilgili ek notlar (opsiyonel)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}