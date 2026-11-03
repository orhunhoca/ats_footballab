import { useState } from "react";
import { useRouter } from "next/router";
import { CalendarDays, Lightbulb, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AGES, getCurriculum, MAX_AGE, MIN_AGE, type TopicPlan } from "@/lib/training/curriculum";
import { SessionPlanView } from "./SessionPlanView";

function parseAge(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= MIN_AGE && n <= MAX_AGE ? n : 10;
}

/** Yaşa göre 6 haftalık program: konu başlığına basınca Cumartesi/Pazar planı açılır. */
export function AgePrograms() {
  const router = useRouter();
  const age = parseAge(router.query.yas);
  const [open, setOpen] = useState<TopicPlan | null>(null);
  const { profile, topics } = getCurriculum(age);

  const selectAge = (a: number) => router.replace({ pathname: router.pathname, query: { ...router.query, yas: a } }, undefined, { shallow: true });

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Yaş seçin</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Yaş seçimi">
          {AGES.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={a === age ? "default" : "outline"}
              className={a === age ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              aria-pressed={a === age}
              onClick={() => selectAge(a)}
            >
              {a} yaş
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            {age} yaş — {profile.aim}
          </CardTitle>
          <CardDescription>
            Haftada 2 seans: Cumartesi 1 saat (teknik ağırlıklı), Pazar 1 saat (oyun ağırlıklı) · {profile.group} · {profile.ball} · maç biçimi {profile.buyuk}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-semibold">Bu yaşın özellikleri</p>
            <ul className="ml-5 list-disc space-y-0.5 text-sm text-gray-700">
              {profile.development.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Antrenör notları
            </p>
            <ul className="ml-5 list-disc space-y-0.5 text-sm text-gray-700">
              {profile.notes.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-emerald-600" />
          6 haftalık konu başlıkları
        </h3>
        <p className="mb-3 text-sm text-gray-600">Bir konuya basın: Cumartesi ve Pazar planı, malzemeler ve egzersiz ayrıntıları açılır. 6 hafta bitince döngüyü baştan tekrarlayıp zorlaştırabilirsiniz.</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpen(t)}
              className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">{t.week}. hafta</p>
              <p className="mt-1 font-semibold text-gray-900">{t.title}</p>
              <p className="mt-1 text-sm text-gray-600">{t.why}</p>
              <p className="mt-2 text-xs text-gray-500">Cumartesi 60 dk · Pazar 60 dk</p>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">
                  {age} yaş · {open.week}. hafta: {open.title}
                </DialogTitle>
                <DialogDescription>{open.why}</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="saturday">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="saturday">Cumartesi</TabsTrigger>
                  <TabsTrigger value="sunday">Pazar</TabsTrigger>
                </TabsList>
                <TabsContent value="saturday" className="pt-3">
                  <SessionPlanView plan={open.saturday} />
                </TabsContent>
                <TabsContent value="sunday" className="pt-3">
                  <SessionPlanView plan={open.sunday} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
