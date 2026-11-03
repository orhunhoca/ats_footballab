import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, CheckCircle2, FileVideo, Loader2, Play, RotateCcw, Square, Camera, Video } from "lucide-react";
import { MarkdownLite } from "@/components/MarkdownLite";
import { onVideoFrame, useCamera } from "@/hooks/useCamera";
import { usePoseLandmarker } from "@/hooks/usePoseLandmarker";
import { analyzeKick, analyzeRun, type PoseFrame, type TechniqueKind, type TechniqueResult } from "@/lib/measure/techniqueMetrics";
import type { Landmark } from "@/lib/measure/plankPose";
import { techniqueService, type TechniqueAnalysisRow, type TechniqueFeedback } from "@/services/techniqueService";
import type { Student } from "@/services/studentService";
import { useToast } from "@/hooks/use-toast";
import { drawPoseOverlay } from "./poseOverlay";

const MAX_LIVE_SECONDS = 20;
type Source = "camera" | "file";
type Phase = "capture" | "processing" | "result";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
}

const KIND_LABEL: Record<TechniqueKind, string> = { run: "Koşu", kick: "Şut" };
const GUIDE: Record<TechniqueKind, string> = {
  run: "Çocuk kameranın önünden yandan, düz bir hatta koşsun (10–20 m). Kamera sabit, çocuk baştan ayağa görünsün; en az 3–4 saniyelik koşu yeterli.",
  kick: "Çocuk topa yandan görünecek şekilde şut çeksin (3–4 adım koşu + vuruş). Kamera sabit ve vuran bacak kameraya bakan tarafta olsun; vuruştan sonraki devam hareketi de görünsün.",
};

export function TechniqueDialog({ open, onOpenChange, student }: Props) {
  const { toast } = useToast();
  const { videoRef, status, error, aspect, start, stop } = useCamera();
  const { landmarker, state: modelState, error: modelError } = usePoseLandmarker();
  const overlay = useRef<HTMLCanvasElement | null>(null);
  const frames = useRef<PoseFrame[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const fileUrl = useRef<string | null>(null);

  const [kind, setKind] = useState<TechniqueKind>("run");
  const [source, setSource] = useState<Source>("camera");
  const [phase, setPhase] = useState<Phase>("capture");
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<TechniqueResult | null>(null);
  const [feedback, setFeedback] = useState<TechniqueFeedback | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<TechniqueAnalysisRow[]>([]);
  const [tab, setTab] = useState("new");

  // Kamera kaynağı
  useEffect(() => {
    if (!open || source !== "camera" || phase !== "capture") return;
    start("environment");
    return () => stop();
  }, [open, source, phase, start, stop]);

  const loadHistory = async () => {
    try {
      setHistory(await techniqueService.list(student.id));
    } catch {
      setHistory([]);
    }
  };
  useEffect(() => {
    if (open && tab === "history") loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, student.id]);

  const cleanupFile = () => {
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    fileUrl.current = null;
  };

  const reset = () => {
    stopRef.current?.();
    stopRef.current = null;
    cleanupFile();
    frames.current = [];
    setRecording(false);
    setProgress(0);
    setSeconds(0);
    setResult(null);
    setFeedback(null);
    setSaved(false);
    setPhase("capture");
    drawPoseOverlay(overlay.current, undefined);
  };

  const close = (o: boolean) => {
    if (saving) return;
    if (!o) {
      reset();
      setTab("new");
    }
    onOpenChange(o);
  };

  const finish = async () => {
    stopRef.current?.();
    stopRef.current = null;
    setRecording(false);
    const video = videoRef.current;
    video?.pause();
    drawPoseOverlay(overlay.current, undefined);
    const asp = video && video.videoWidth ? video.videoWidth / video.videoHeight : aspect;
    const res = kind === "run" ? analyzeRun(frames.current, asp) : analyzeKick(frames.current, asp);
    setResult(res);
    setPhase("processing");
    const fb = await techniqueService.analyze(res, student.name, student.age);
    setFeedback(fb);
    setPhase("result");
  };

  const beginCapture = () => {
    const video = videoRef.current;
    const lm = landmarker.current;
    if (!video || !lm) return;
    frames.current = [];
    setSeconds(0);
    setProgress(0);
    setRecording(true);
    const t0 = performance.now();
    const isFile = source === "file";
    if (isFile) {
      video.currentTime = 0;
      video.playbackRate = kind === "kick" ? 0.5 : 1; // hızlı vuruşta daha çok kare yakalanır (zaman ekseni video süresidir)
      video.onended = () => finish();
      video.play().catch(() => finish());
    }
    stopRef.current = onVideoFrame(video, (t, mediaMs) => {
      if (video.readyState < 2) return;
      let lms: Landmark[] | undefined;
      try {
        lms = lm.detectForVideo(video, performance.now()).landmarks?.[0];
      } catch {
        return;
      }
      const ft = isFile ? mediaMs : t;
      frames.current.push({ t: ft, lms: lms ?? [] });
      drawPoseOverlay(overlay.current, lms);
      const elapsed = (performance.now() - t0) / 1000;
      setSeconds(isFile ? mediaMs / 1000 : elapsed);
      if (isFile && video.duration) setProgress(Math.min(100, (mediaMs / 1000 / video.duration) * 100));
      if (!isFile && elapsed >= MAX_LIVE_SECONDS) finish();
    });
  };

  const pickFile = (file: File | undefined) => {
    const video = videoRef.current;
    if (!file || !video) return;
    stop();
    cleanupFile();
    fileUrl.current = URL.createObjectURL(file);
    video.srcObject = null;
    video.muted = true;
    video.src = fileUrl.current;
    video.load();
    setSource("file");
  };

  const save = async () => {
    if (!result || !feedback) return;
    setSaving(true);
    try {
      await techniqueService.save(student.id, result, feedback);
      setSaved(true);
      toast({ title: "Kaydedildi", description: `${student.name} — ${KIND_LABEL[result.kind]} tekniği analizi` });
    } catch (e) {
      console.error("technique save error:", e);
      toast({ title: "Hata", description: "Analiz kaydedilemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const ready = modelState === "ready" && (source === "file" ? !!fileUrl.current : status === "ready");

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Activity className="h-5 w-5 text-emerald-600" />
            Teknik Analiz — {student.name}
          </DialogTitle>
          <DialogDescription>
            Koşu ve şut tekniği, yapay zekâ ile vücut iskeletinden analiz edilir. Video telefondan çıkmaz; yalnızca hesaplanan sayılar yorumlanır.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Yeni analiz</TabsTrigger>
            <TabsTrigger value="history">Geçmiş</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            {phase === "capture" && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {(["run", "kick"] as const).map((k) => (
                    <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} disabled={recording} onClick={() => setKind(k)}>
                      {KIND_LABEL[k]} tekniği
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{GUIDE[kind]}</p>

                <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: String(aspect) }}>
                  <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
                  <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full" width={640} height={Math.round(640 / aspect)} />
                  {recording && (
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {seconds.toFixed(1)} sn
                    </div>
                  )}
                  {source === "camera" && status !== "ready" && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
                      {status === "error" ? error : <Loader2 className="h-6 w-6 animate-spin" />}
                    </div>
                  )}
                  {source === "file" && !fileUrl.current && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">Video seçin</div>
                  )}
                </div>
                {source === "file" && recording && (
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}

                {modelState === "loading" && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Yapay zekâ modeli yükleniyor…
                  </p>
                )}
                {modelState === "error" && <p className="text-sm text-destructive">{modelError}</p>}

                <div className="flex flex-wrap gap-2">
                  {!recording ? (
                    <Button onClick={beginCapture} disabled={!ready}>
                      <Play className="mr-2 h-4 w-4" /> {source === "file" ? "Videoyu analiz et" : "Kaydı başlat"}
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={finish}>
                      <Square className="mr-2 h-4 w-4" /> Bitir ve analiz et
                    </Button>
                  )}
                  <label className={`inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent ${recording ? "pointer-events-none opacity-50" : ""}`}>
                    <FileVideo className="mr-2 h-4 w-4" /> Videodan analiz (dosya seç)
                    <input type="file" accept="video/*" className="hidden" disabled={recording} onChange={(e) => pickFile(e.target.files?.[0])} />
                  </label>
                  {source === "file" && !recording && (
                    <Button variant="ghost" size="sm" onClick={() => { cleanupFile(); if (videoRef.current) videoRef.current.removeAttribute("src"); setSource("camera"); }}>
                      <Camera className="mr-2 h-4 w-4" /> Canlı kameraya dön
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Canlı kayıt en fazla {MAX_LIVE_SECONDS} saniye sürer. Telefonun kamerasıyla önce videoyu çekip “Videodan analiz” ile yüklemek de olur; video cihazınızda işlenir, sunucuya gönderilmez.
                </p>
              </>
            )}

            {phase === "processing" && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm text-muted-foreground">Göstergeler hesaplandı, yapay zekâ yorumluyor…</p>
              </div>
            )}

            {phase === "result" && result && feedback && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{KIND_LABEL[result.kind]} tekniği</Badge>
                  <Badge variant={result.quality.ok ? "outline" : "destructive"}>
                    {result.quality.ok ? "Görüntü kalitesi yeterli" : "Güvenilirlik düşük"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {result.quality.frames} kare · {result.quality.seconds} sn · çocuk karelerin %{Math.round(result.quality.trackedRatio * 100)}'inde görüldü
                    {result.kickingLeg ? ` · vuran bacak: ${result.kickingLeg}` : ""}
                  </span>
                </div>
                {result.quality.note && (
                  <Alert variant="destructive">
                    <AlertDescription>{result.quality.note}</AlertDescription>
                  </Alert>
                )}

                {result.metrics.length > 0 && (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <tbody>
                        {result.metrics.map((m) => (
                          <tr key={m.key} className="border-b last:border-0">
                            <td className="p-2 font-medium">{m.label}</td>
                            <td className="whitespace-nowrap p-2 tabular-nums">
                              {m.value === null ? "—" : m.value} <span className="text-muted-foreground">{m.unit}</span>
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">{m.hint}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {feedback.notice && <p className="text-xs text-amber-700">{feedback.notice}</p>}
                <div className="rounded-md border bg-slate-50 p-4">
                  <MarkdownLite text={feedback.analysis} />
                  {feedback.parentSummary && (
                    <p className="mt-3 border-t pt-3 text-sm">
                      <strong>Veliye özet:</strong> {feedback.parentSummary}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} disabled={saving || saved || result.metrics.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {saved ? "Kaydedildi" : "Analizi Kaydet"}
                  </Button>
                  <Button variant="outline" onClick={reset} disabled={saving}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Yeni analiz
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Bu öğrenci için kayıtlı teknik analiz yok.</p>
            ) : (
              history.map((h) => (
                <details key={h.id} className="rounded-md border p-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
                    <Video className="h-4 w-4 text-emerald-600" />
                    {h.kind === "run" ? "Koşu" : "Şut"} tekniği · {new Date(h.created_at).toLocaleDateString("tr-TR")}
                    {h.ai_generated && <Badge variant="outline">Yapay zekâ</Badge>}
                  </summary>
                  <div className="mt-3">
                    <MarkdownLite text={h.analysis} />
                  </div>
                </details>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
