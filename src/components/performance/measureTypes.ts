export interface MeasureResult {
  /** ölçülen değer (protokolün biriminde: saniye ya da cm) */
  value: number;
  /** ölçüm yöntemi açıklaması (nota yazılır) */
  method: string;
  /** başlangıç/bitiş görüntüleri (data URL) — onay ekranında gösterilir, kaydedilmez */
  snapshots: { label: string; src: string }[];
  /** onay ekranında değer alanının etiketi (varsayılan: "ölçülen süre") */
  label?: string;
  /** onay ekranında ek bilgi (ör. uçuş süresi) */
  detail?: string;
}
