import type { CSSProperties } from "react";

/** Telefonda kamera pencereleri tüm ekranı kaplar; masaüstünde normal pencere kalır */
export const CAMERA_DIALOG_CLASS =
  "max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:p-3";

/** Kamera görüntüsü: oranı korur, ekran yüksekliğinin ~%62'sini geçmez (çizgi hizası bozulmasın diye genişlik oranla küçülür) */
export function stageStyle(aspect: number): CSSProperties {
  return { aspectRatio: String(aspect), width: `min(100%, ${(62 * aspect).toFixed(1)}dvh)` };
}

/** Birincil eylem düğmeleri: parmakla rahat basılır */
export const BIG_BTN = "h-14 min-w-[140px] flex-1 text-base sm:h-11 sm:flex-none";
