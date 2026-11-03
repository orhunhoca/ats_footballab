import { LM, type Landmark } from "@/lib/measure/plankPose";

const BONES: [number, number][] = [
  [LM.lShoulder, LM.lElbow], [LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow], [LM.rElbow, LM.rWrist],
  [LM.lShoulder, LM.lHip], [LM.rShoulder, LM.rHip], [LM.lHip, LM.lKnee], [LM.lKnee, LM.lAnkle],
  [LM.rHip, LM.rKnee], [LM.rKnee, LM.rAnkle], [LM.lShoulder, LM.rShoulder], [LM.lHip, LM.rHip],
];

/** Video üzerindeki şeffaf tuvale iskelet çizer */
export function drawPoseOverlay(canvas: HTMLCanvasElement | null, lms: Landmark[] | undefined, color = "#22c55e") {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lms) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const [a, b] of BONES) {
    const p = lms[a];
    const q = lms[b];
    if (!p || !q) continue;
    ctx.beginPath();
    ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
    ctx.lineTo(q.x * canvas.width, q.y * canvas.height);
    ctx.stroke();
  }
}
