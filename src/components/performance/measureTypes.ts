export interface MeasureResult {
  /** ölçülen değer (saniye) */
  value: number;
  /** ölçüm yöntemi açıklaması (nota yazılır) */
  method: string;
  /** başlangıç/bitiş görüntüleri (data URL) — onay ekranında gösterilir, kaydedilmez */
  snapshots: { label: string; src: string }[];
}
