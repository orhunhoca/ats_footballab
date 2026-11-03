import { DRILLS, type Drill } from "./drills";

export { DRILLS };

/**
 * 6–16 yaş antrenman müfredatı: her yaş için 6 haftalık konu döngüsü; her hafta Cumartesi (teknik ağırlıklı)
 * ve Pazar (oyun ağırlıklı) birer saat. Egzersiz metinleri yaş profiline göre (alan, top, oyun biçimi, mesafe) uyarlanır.
 */
export const MIN_AGE = 6;
export const MAX_AGE = 16;
export const SESSION_MINUTES = 60;

export interface AgeProfile {
  age: number;
  ball: string;
  alan: string;
  oyunAlani: string;
  kucuk: string;
  buyuk: string;
  kale: string;
  calisma: string;
  dinlenme: string;
  mesafe: string;
  uzun: string;
  group: string;
  aim: string;
  development: string[];
  notes: string[];
}

interface Band {
  ball: string;
  alan: string;
  oyunAlani: string;
  kucuk: string;
  buyuk: string;
  kale: string;
  calisma: string;
  dinlenme: string;
  mesafe: string;
  uzun: string;
  group: string;
}

function band(age: number): Band {
  if (age <= 7)
    return { ball: "3 numara top", alan: "15x15 m", oyunAlani: "20x30 m", kucuk: "3v3", buyuk: "4v4", kale: "2 m'lik mini kale (huni ile)", calisma: "30–40 sn", dinlenme: "20–30 sn", mesafe: "4–5 m", uzun: "8–10 m", group: "8–12 çocuk (mümkünse 2 antrenör)" };
  if (age <= 9)
    return { ball: age === 9 ? "4 numara top" : "3 numara top", alan: "20x20 m", oyunAlani: "30x40 m", kucuk: "4v4", buyuk: "5v5", kale: "2 m'lik mini kale (huni ile)", calisma: "45 sn", dinlenme: "30 sn", mesafe: "5–7 m", uzun: "10–12 m", group: "10–16 çocuk (antrenör başına en fazla 12)" };
  if (age <= 11)
    return { ball: "4 numara top", alan: "20x25 m", oyunAlani: "40x50 m", kucuk: "5v5", buyuk: "7v7", kale: "3 m'lik mini kale", calisma: "1 dk", dinlenme: "30 sn", mesafe: "8–10 m", uzun: "15–20 m", group: "10–16 çocuk (antrenör başına en fazla 12)" };
  if (age <= 13)
    return { ball: age === 12 ? "4 numara top" : "5 numara top", alan: "25x30 m", oyunAlani: "50x60 m", kucuk: "6v6", buyuk: "8v8", kale: "5 m'lik küçük kale", calisma: "1–2 dk", dinlenme: "30–45 sn", mesafe: "10–15 m", uzun: "20–25 m", group: "12–20 oyuncu" };
  return { ball: "5 numara top", alan: "30x30 m", oyunAlani: "60x70 m", kucuk: "7v7", buyuk: "9v9 veya 11v11", kale: "5 m'lik küçük kale (veya tam boy kale)", calisma: "1–2 dk", dinlenme: "30–45 sn", mesafe: "12–20 m", uzun: "25–35 m", group: "12–20 oyuncu" };
}

const AGE_INFO: Record<number, { aim: string; development: string[]; notes: string[] }> = {
  6: {
    aim: "Futbolu sevdirmek; topla arkadaş olmak.",
    development: ["Dikkat süresi kısa (5–8 dk); sık değişen oyunlar gerekir", "Sağ-sol ayrımı ve denge gelişiyor", "Rekabetten çok eğlence ve hikâye dili işe yarar"],
    notes: ["Her çocuğun kendi topu olsun; sıra bekletmeyin", "Talimat 1–2 cümle: önce göster, sonra yaptır", "Skor tutmayın; her denemeyi övgüyle karşılayın"],
  },
  7: {
    aim: "Top sürme ve temel kontrolün alışkanlığa dönüşmesi.",
    development: ["Dikkat süresi 8–10 dk", "Koşu ve denge belirgin gelişiyor", "Pas yerine top sürmek hâlâ doğal; bencillik değil, gelişim"],
    notes: ["Küçük oyunlar (3v3–4v4) en çok dokunuşu sağlar", "Pas fikrini oyunla tanıtın: 'topu arkadaşına ver, o da sana versin'", "Sağ ve sol ayağı eşit çalıştırın"],
  },
  8: {
    aim: "Dripling cesareti ve ilk pas alışkanlığı.",
    development: ["Koordinasyonun hızla geliştiği 'altın çağ'", "Takım fikri başlıyor", "Basit kuralları anlıyor, adaleti önemsiyor"],
    notes: ["Teknik öğrenmek için ideal yaş: çok tekrar, oyunsal ortam", "Her çocuk her pozisyonu (kaleci dahil) denesin", "Sonucu değil gelişimi övün"],
  },
  9: {
    aim: "Pas-kontrol temeli; 1'e 1'de hem hücum hem savunma.",
    development: ["Teknik öğrenme hızı yüksek", "Takım içi roller anlaşılmaya başlıyor", "Kaybetmeye duygusal tepkiler güçlü olabilir"],
    notes: ["Pas ve hareketi birlikte çalıştırın; sadece durağan pas değil", "Rekabeti kayıpsız tutun: turlarda takımlar değişsin", "Kaleci ve saha oyuncusu rolünü sırayla verin"],
  },
  10: {
    aim: "Pas–kontrol–hareket üçlüsü ve baskı altında oyun.",
    development: ["Teknik beceriler oturuyor", "Takım oyunu anlayışı gelişiyor", "Büyüme başlayabilir; koordinasyon geçici bozulabilir"],
    notes: ["Rondo ile karar süresini kısaltın", "Fiziksel yükü oyun içi koşuyla kazandırın, ayrıca yük bindirmeyin", "Hataları bireysel değil takım olarak ele alın"],
  },
  11: {
    aim: "Oyun kurma, topu koruma ve pozisyon fikri.",
    development: ["Büyüme sıçraması başlayabilir", "Taktik kavramlar (açı, boşluk) anlaşılır", "Kız-erkek ve bireysel gelişim farkları belirgin"],
    notes: ["Pozisyonları sabitlemeyin; herkes her yerde oynasın", "Anlatım kısa; soru sorarak düşündürün ('neden boşa koştun?')", "Büyüme dönemindeki çocuklarda yükü azaltın; diz/topuk ağrısı varsa dinlendirin"],
  },
  12: {
    aim: "Takım oyununa geçiş: arkadan çıkış, kanat ve takım presi.",
    development: ["Büyüme hızlanır; denge ve koordinasyon geçici düşebilir", "Kuvvet çalışması vücut ağırlığıyla yapılmalı", "Aynı yaşta bile fiziksel farklar çok büyük"],
    notes: ["Kafa vuruşu yok ya da çok az; yalnızca hafif toplarla", "Eşleştirmeyi boya göre değil beceriye göre yapın", "Sorumluluk verin: kaptanı sırayla değiştirin"],
  },
  13: {
    aim: "Taktik farkındalık: pres, geçiş ve kanat; kuvvet temeli.",
    development: ["Ergenlik büyüme hızı zirve yapabilir; sakatlık riski artar", "Soyut düşünme gelişir; taktik anlatımı mümkün", "Akran etkisi ve motivasyon değişebilir"],
    notes: ["Isınmayı atlamayın; dinamik ısınma şart", "Büyüme dönemindeki oyuncuda sprint/sıçrama yükünü azaltın", "Bireysel geri bildirimi özelde ve olumlu verin"],
  },
  14: {
    aim: "Pozisyona özgü oyun: üçüncü adam, çıkış ve baskı.",
    development: ["Kuvvet hızla artar", "Taktik anlayış yüksek", "Yorgunluk ve toparlanma süresi uzayabilir"],
    notes: ["Kuvvet devresinde önce teknik, sonra yük", "Isınmaya kalça ve ayak bileği çalışmaları ekleyin (sakatlık önleme)", "Okul/sınav dönemlerinde yükü ve motivasyonu konuşun"],
  },
  15: {
    aim: "Oyun zekâsı ve hız: sınırlı dokunuş, pres ve bitirme; kontrollü kafa vuruşu.",
    development: ["Fiziksel olgunlaşma kişiden kişiye farklı hızda", "Yüksek tempoyu kaldırabilir", "Liderlik ve takım sorumluluğu artar"],
    notes: ["Antrenman yükünü bireye göre uyarlayın", "Yarışma baskısı: hata yapana destek olun", "Kafa vuruşu az tekrar ve kontrollü"],
  },
  16: {
    aim: "Maça hazır oyun: hızlı düşünme, baskı ve kombinasyon.",
    development: ["Gençlik takımına geçiş hazırlığı", "Fiziksel hazırlık, uyku ve beslenme önem kazanır", "Karar baskısı altında performans öne çıkar"],
    notes: ["Antrenman sonu geri bildirim: bir güçlü yan, bir gelişim alanı", "Okul-spor dengesi, uyku ve beslenmeyi hatırlatın", "Bireysel hedefler koyun ve takip edin"],
  },
};

export function getAgeProfile(age: number): AgeProfile {
  const clamped = Math.min(MAX_AGE, Math.max(MIN_AGE, age));
  return { age: clamped, ...band(clamped), ...AGE_INFO[clamped] };
}

// ------------------------------------------------------------------ Konular

type SlotOption = { id: string; from?: number; to?: number };
/** Tek egzersiz kimliği ya da yaş aralığına göre ilk uyan seçenek */
type Slot = string | SlotOption[];

interface Topic {
  id: string;
  title: string;
  why: string;
  sat: { warm: Slot; tech1: Slot; tech2: Slot; game: Slot; rule: string };
  sun: { warm: Slot; tech: Slot; game1: Slot; rule1: string; game2: Slot; rule2: string };
}

const warmByAge: Slot = [
  { id: "yakalamaca-top", to: 9 },
  { id: "isinma-pas-dortgeni", from: 10 },
];

const TOPICS: Record<string, Topic> = {
  "top-hakimiyeti": {
    id: "top-hakimiyeti",
    title: "Topla Arkadaş Olalım: Top Hakimiyeti",
    why: "Top ayağa yapışırsa futbolun geri kalanı kolaylaşır.",
    sat: { warm: "kapi-avi", tech1: "top-hakimiyeti-tabani", tech2: "huni-labirenti", game: "sartli-mini-mac", rule: "Her oyuncu golden önce topa en az 3 kez dokunsun." },
    sun: { warm: "yakalamaca-top", tech: "hizli-surme-bitis", game1: "dort-kale-oyunu", rule1: "Topu sürerek veya şutla herhangi bir kaleye gol atılabilir.", game2: "sartli-mini-mac", rule2: "Bir rakibi top sürerek geçen oyuncunun golü 2 sayılır." },
  },
  "top-surme": {
    id: "top-surme",
    title: "Top Sürme ve Yön Değiştirme",
    why: "Dar alanda topu kaybetmeden yön değiştirmek tüm oyunun temeli.",
    sat: { warm: "trafik-isiklari", tech1: "huni-labirenti", tech2: "ceviklik-slalom", game: "sartli-mini-mac", rule: "Gol atmadan önce topla en az bir rakibi geç." },
    sun: { warm: "kapi-avi", tech: "hizli-surme-bitis", game1: "dort-kale-oyunu", rule1: "Topu sürerek ya da şutla gol atılabilir; yön değiştirme yapan oyuncu övülür.", game2: "mini-turnuva", rule2: "Dripling yapıp gol atan oyuncunun golü 2 sayılır." },
  },
  pas: {
    id: "pas",
    title: "Doğru Pas, Doğru Kontrol",
    why: "İsabetli pas ve yumuşak ilk kontrol takım oyununun anahtarı.",
    sat: { warm: "isinma-pas-dortgeni", tech1: "ikili-pas", tech2: "yonlu-kontrol", game: "sartli-mini-mac", rule: "Her golden önce takım en az 3 pas yapsın." },
    sun: { warm: "isinma-pas-dortgeni", tech: "pas-hareket-kare", game1: "joker-oyunu", rule1: "Her golden önce en az 3 pas.", game2: "sartli-mini-mac", rule2: "5 pas yapan takıma bonus puan." },
  },
  sut: {
    id: "sut",
    title: "Şut ve Gol Sevinci",
    why: "Şut çekme cesareti ve doğru vuruş tekniği gol getirir.",
    sat: { warm: "kapi-avi", tech1: "sut-parkuru", tech2: "kaleci-temel", game: "sartli-mini-mac", rule: "Fırsat bulan hemen şut atsın; kaleci herkes olabilir." },
    sun: { warm: "yakalamaca-top", tech: "hizli-surme-bitis", game1: "dort-kale-oyunu", rule1: "Her fırsatta şut; gol atan takımdan bir çocuk kaleci olur.", game2: "sartli-mini-mac", rule2: "İlk iki dokunuşta şut atan oyuncunun golü 2 sayılır." },
  },
  "bire-bir-hucum": {
    id: "bire-bir-hucum",
    title: "1'e 1: Rakibi Geçmek",
    why: "Cesur dripling hem eğlenceli hem takımı öne taşıyan bir beceri.",
    sat: { warm: "kapi-avi", tech1: "bire-bir-kapi", tech2: "huni-labirenti", game: "sartli-mini-mac", rule: "Her takım golden önce en az bir 1'e 1 denesin; denemeyi kaçırmak ceza değil." },
    sun: { warm: "trafik-isiklari", tech: "bire-bir-kapi", game1: "dort-kale-oyunu", rule1: "Topu sürerek bir rakibi geçen oyuncu golü 2 puandır.", game2: "mini-turnuva", rule2: "1'e 1'i kazanan oyuncu +1 puan." },
  },
  "bire-bir-savunma": {
    id: "bire-bir-savunma",
    title: "1'e 1 Savunma: Topu Kazanma",
    why: "Doğru yaklaşma ve duruş, topu kazanmanın en güvenli yolu.",
    sat: { warm: "ayna-oyunu", tech1: "savunma-durus", tech2: "bire-bir-kapi", game: "sartli-mini-mac", rule: "Topu kazanan oyuncunun takımı golü 2 puan sayar." },
    sun: { warm: "kapi-avi", tech: "savunma-durus", game1: "gecis-oyunu", rule1: "Top kazanıp 6 saniyede bitirirsek gol 2 sayılır.", game2: "sartli-mini-mac", rule2: "Topu doğru yaklaşıp kazanan oyuncuya takım alkışı." },
  },
  "ceviklik-koordinasyon": {
    id: "ceviklik-koordinasyon",
    title: "Çeviklik, Denge ve Koordinasyon",
    why: "Vücudunu iyi yöneten çocuk topu da iyi yönetir; sakatlıktan korur.",
    sat: { warm: "koordinasyon-parkuru", tech1: "ceviklik-slalom", tech2: "denge-kuvvet-oyunu", game: "sprint-kupasi", rule: "Her turun galibi puan alır; kaybeden takım da alkışlanır." },
    sun: { warm: "ayna-oyunu", tech: [{ id: "ceviklik-slalom", to: 8 }, { id: "hiz-reaksiyon", from: 9 }], game1: "sprint-kupasi", rule1: "Topla yapılan turlar 2 puan.", game2: "sartli-mini-mac", rule2: "Gol atmadan önce takımın tüm oyuncuları topa dokunsun." },
  },
  "topu-koruma": {
    id: "topu-koruma",
    title: "Topu Koruma ve Çevirme",
    why: "Baskı altında topu vücutla korumak takıma zaman kazandırır.",
    sat: { warm: "kapi-avi", tech1: "top-koruma", tech2: "rondo", game: "sartli-mini-mac", rule: "Topu 5 saniye koruyan oyuncunun takımı 1 puan alır." },
    sun: { warm: "yakalamaca-top", tech: "rondo", game1: "joker-oyunu", rule1: "Topu 8 pas boyunca koruyan takım puan alır.", game2: "sartli-mini-mac", rule2: "Topu koruyup çeviren oyuncunun pası 'altın pas' sayılır." },
  },
  "ikili-oyun": {
    id: "ikili-oyun",
    title: "İkili Oyun: Duvar Pası (1–2)",
    why: "İkili oyun rakibi pasla geçmenin en kolay yolu.",
    sat: { warm: "isinma-pas-dortgeni", tech1: "duvar-pasi", tech2: "pas-hareket-kare", game: "sartli-mini-mac", rule: "1–2 yapıp geçen oyuncunun golü 2 puandır." },
    sun: { warm: "ayna-oyunu", tech: "duvar-pasi", game1: "joker-oyunu", rule1: "1–2 yapan oyuncu +1 puan.", game2: "dort-kale-oyunu", rule2: "Duvar pasıyla atılan gol 2 sayılır." },
  },
  "rondo-gecis": {
    id: "rondo-gecis",
    title: "Topla Oyun Kurma: Rondo ve Geçişler",
    why: "Rondo baskı altında hızlı ve doğru karar vermeyi öğretir.",
    sat: { warm: "isinma-pas-dortgeni", tech1: "rondo", tech2: "sinirli-dokunus", game: "joker-oyunu", rule: "Jokeri kullanan takım hızla pas serisi kursun." },
    sun: { warm: "dinamik-isinma", tech: "rondo", game1: "gecis-oyunu", rule1: "Top kazanınca 6 sn içinde bitiren takım 2 gol sayar.", game2: "buyuk-oyun", rule2: "Takım 3 pas sonrası hücum eder." },
  },
  "hiz-reaksiyon": {
    id: "hiz-reaksiyon",
    title: "Hız ve Reaksiyon",
    why: "İlk 3 adım ve komuta tepki oyunun belirleyicisi.",
    sat: { warm: "dinamik-isinma", tech1: "hiz-reaksiyon", tech2: "hizli-surme-bitis", game: "sprint-kupasi", rule: "Her turun galibi puan; son turda tüm takımlar birlikte yarışır." },
    sun: { warm: "koordinasyon-parkuru", tech: "ceviklik-slalom", game1: "gecis-oyunu", rule1: "Top kazanınca 6 sn içinde bitiren takıma ekstra puan.", game2: "sartli-mini-mac", rule2: "Hızlı atak (6 saniye) golü 2 puan." },
  },
  "uzun-pas": {
    id: "uzun-pas",
    title: "Uzun Pas ve Oyunu Değiştirme",
    why: "Oyunu karşı kanada çevirmek rakibin dengesini bozar.",
    sat: { warm: "dinamik-isinma", tech1: "uzun-pas", tech2: "yonlu-kontrol", game: "dort-kale-oyunu", rule: "Karşı kanada uzun pasla başlayan atak golü 2 puandır." },
    sun: { warm: "isinma-pas-dortgeni", tech: "uzun-pas", game1: "dort-kale-oyunu", rule1: "Oyunu en az bir kez çevirmeden gol sayılmaz.", game2: "buyuk-oyun", rule2: "Kanat oyuncuları taç çizgisini kullanmak zorunda." },
  },
  "kanat-orta": {
    id: "kanat-orta",
    title: "Kanat Oyunu ve Orta",
    why: "Kanattan alçak ve sert ortalar en kolay gol yollarından biri.",
    sat: { warm: "dinamik-isinma", tech1: "orta-bitirme", tech2: [{ id: "duvar-pasi", to: 12 }, { id: "kanat-bindirme", from: 13 }], game: "sartli-mini-mac", rule: "Gol öncesinde kanattan orta yapılması zorunlu." },
    sun: { warm: "isinma-pas-dortgeni", tech: "orta-bitirme", game1: "dort-kale-oyunu", rule1: "Kanattan gelen ortayla atılan gol 2 puan.", game2: "buyuk-oyun", rule2: "Her atakta en az bir kanat oyuncusu topa dokunmalı." },
  },
  "cikis-oyun-kurma": {
    id: "cikis-oyun-kurma",
    title: "Arkadan Oyun Kurma",
    why: "Kaleciden başlayan temiz çıkış baskıyı aşmanın anahtarı.",
    sat: { warm: "isinma-pas-dortgeni", tech1: "rondo", tech2: "cikis-oyunu", game: [{ id: "sartli-mini-mac", to: 11 }, { id: "buyuk-oyun", from: 12 }], rule: "Kaleciden başlayan atak ve en az 3 pas sonrası orta çizgi geçilsin." },
    sun: { warm: "dinamik-isinma", tech: "cikis-oyunu", game1: "joker-oyunu", rule1: "Kaleciden başlayan çıkış başarılı olursa 1 puan.", game2: "buyuk-oyun", rule2: "Baskı yapan takım önce yarı sahada baskı kurar." },
  },
  "pres-gecis": {
    id: "pres-gecis",
    title: "Top Kaybında Baskı ve Geçiş Oyunu",
    why: "Top kaybında hemen birlikte baskı, topu geri kazanmanın en hızlı yolu.",
    sat: { warm: "dinamik-isinma", tech1: [{ id: "savunma-durus", to: 12 }, { id: "rondo", from: 13 }], tech2: "pres-tetik", game: "gecis-oyunu", rule: "Top kazanan takım 6 saniyede bitirirse gol 2 sayılır." },
    sun: { warm: "dinamik-isinma", tech: "pres-tetik", game1: "gecis-oyunu", rule1: "Top kaybında 5 saniye baskı; geri kazanırsak 1 puan.", game2: "buyuk-oyun", rule2: "Top kaybında hemen birlikte baskı kurulacak." },
  },
  "ucuncu-adam": {
    id: "ucuncu-adam",
    title: "Kombinasyon: Üçüncü Adam Koşusu",
    why: "Pas serisinde boşa koşan üçüncü oyuncu savunmayı çözer.",
    sat: { warm: "dinamik-isinma", tech1: "rondo", tech2: "uc-adam", game: "joker-oyunu", rule: "Üçüncü adam koşusuyla atılan gol 2 sayılır." },
    sun: { warm: "isinma-pas-dortgeni", tech: "uc-adam", game1: "sartli-mini-mac", rule1: "Gol öncesi en az 3 oyuncunun dahil olduğu pas serisi.", game2: "buyuk-oyun", rule2: "Üçüncü adam koşusuyla atılan gol 2 puandır." },
  },
  "kafa-kuvvet": {
    id: "kafa-kuvvet",
    title: "Kafa Vuruşu (Kontrollü) ve Ortadan Bitirme",
    why: "Havadaki toplarda doğru teknik, güvenle ve az tekrarla öğrenilir.",
    sat: { warm: "dinamik-isinma", tech1: "kafa-yumusak", tech2: "orta-bitirme", game: "sartli-mini-mac", rule: "Ortadan atılan gol 2 puandır; kafa vuruşu gerekli değil, serbest." },
    sun: { warm: "isinma-pas-dortgeni", tech: "orta-bitirme", game1: "dort-kale-oyunu", rule1: "Orta sonrası gol atan oyuncuya +1 puan.", game2: "buyuk-oyun", rule2: "Kanat ortası ve bitirme koşusu vurgulansın." },
  },
  kuvvet: {
    id: "kuvvet",
    title: "Kuvvet ve Dayanıklılık Devresi",
    why: "Sağlam bir vücut sakatlıktan korur ve oyunun son dakikasında da hızı sürdürür.",
    sat: { warm: "dinamik-isinma", tech1: "kuvvet-devresi", tech2: "hiz-reaksiyon", game: "gecis-oyunu", rule: "Yüksek tempo; top kaybında hemen baskı." },
    sun: { warm: "dinamik-isinma", tech: "kuvvet-devresi", game1: "sartli-mini-mac", rule1: "Oyun akıcı; hızlı atakla atılan gol 2 puan.", game2: "buyuk-oyun", rule2: "Tempolu oyun; dinlenmeyi takım rotasyonuyla yönetin." },
  },
  "sinirli-dokunus": {
    id: "sinirli-dokunus",
    title: "Hızlı Düşün: Sınırlı Dokunuşlu Oyun",
    why: "Topu çabuk oynatmak rakibe zaman vermez.",
    sat: { warm: "isinma-pas-dortgeni", tech1: "sinirli-dokunus", tech2: "rondo", game: "joker-oyunu", rule: "Maksimum 2 dokunuş; ihlalde top rakibe." },
    sun: { warm: "dinamik-isinma", tech: "sinirli-dokunus", game1: "dort-kale-oyunu", rule1: "Maksimum 2 dokunuş; tek dokunuşla atılan gol 2 puan.", game2: "buyuk-oyun", rule2: "Takım oyunu hızlı; 3 saniye kuralı." },
  },
  "oyun-gunu": {
    id: "oyun-gunu",
    title: "Oyun Günü: Mini Turnuva",
    why: "Rekabeti ve fair play'i, öğrendiklerimizi turnuva neşesiyle yaşayarak pekiştiriyoruz.",
    sat: {
      warm: warmByAge,
      tech1: [{ id: "top-hakimiyeti-tabani", to: 9 }, { id: "rondo", from: 10 }],
      tech2: "hizli-surme-bitis",
      game: "mini-turnuva",
      rule: "Her maç 5 dakika; kazanan sahada kalır. Fair play puanı: rakibe el uzatmak 1 puan.",
    },
    sun: {
      warm: warmByAge,
      tech: "sut-parkuru",
      game1: "mini-turnuva",
      rule1: "Gruplar maçı; her takım herkesle oynar.",
      game2: "mini-turnuva",
      rule2: "Final turu: şampiyonluk maçı; her takıma teşekkür belgesi.",
    },
  },
};

// Yaşa göre 6 haftalık konu sırası
const AGE_TOPICS: Record<number, string[]> = {
  6: ["top-hakimiyeti", "top-surme", "ceviklik-koordinasyon", "sut", "pas", "oyun-gunu"],
  7: ["top-hakimiyeti", "top-surme", "pas", "sut", "bire-bir-hucum", "oyun-gunu"],
  8: ["top-surme", "pas", "bire-bir-hucum", "sut", "ceviklik-koordinasyon", "oyun-gunu"],
  9: ["pas", "bire-bir-hucum", "bire-bir-savunma", "ikili-oyun", "sut", "oyun-gunu"],
  10: ["pas", "ikili-oyun", "topu-koruma", "bire-bir-savunma", "rondo-gecis", "oyun-gunu"],
  11: ["rondo-gecis", "ikili-oyun", "cikis-oyun-kurma", "bire-bir-savunma", "hiz-reaksiyon", "oyun-gunu"],
  12: ["cikis-oyun-kurma", "uzun-pas", "kanat-orta", "pres-gecis", "hiz-reaksiyon", "oyun-gunu"],
  13: ["uzun-pas", "kanat-orta", "pres-gecis", "ucuncu-adam", "kuvvet", "oyun-gunu"],
  14: ["cikis-oyun-kurma", "ucuncu-adam", "pres-gecis", "kanat-orta", "kuvvet", "oyun-gunu"],
  15: ["ucuncu-adam", "pres-gecis", "kafa-kuvvet", "sinirli-dokunus", "kuvvet", "oyun-gunu"],
  16: ["sinirli-dokunus", "pres-gecis", "ucuncu-adam", "kafa-kuvvet", "kuvvet", "oyun-gunu"],
};

// ------------------------------------------------------------------ Plan üretimi

export type Phase = "Isınma" | "Konu çalışması" | "Oyun" | "Soğuma";

export interface RenderedDrill extends Omit<Drill, "id"> {
  id: string;
}

export interface Block {
  minutes: number;
  phase: Phase;
  drill: RenderedDrill;
  /** Bu oyun/çalışma için haftanın konusuna özel kural (varsa) */
  rule?: string;
}

export interface SessionPlan {
  id: string;
  day: "saturday" | "sunday";
  dayLabel: "Cumartesi" | "Pazar";
  title: string;
  emphasis: string;
  duration: number;
  players: string;
  materials: string[];
  blocks: Block[];
}

export interface TopicPlan {
  id: string;
  week: number;
  title: string;
  why: string;
  saturday: SessionPlan;
  sunday: SessionPlan;
}

export interface Curriculum {
  profile: AgeProfile;
  topics: TopicPlan[];
}

function resolveSlot(slot: Slot, age: number): string {
  if (typeof slot === "string") return slot;
  const hit = slot.find((o) => (o.from === undefined || age >= o.from) && (o.to === undefined || age <= o.to));
  if (!hit) throw new Error(`Yaş ${age} için uygun egzersiz yok`);
  return hit.id;
}

function fill(text: string, p: AgeProfile, rule?: string): string {
  const values: Record<string, string> = {
    top: p.ball,
    alan: p.alan,
    oyunAlani: p.oyunAlani,
    kucuk: p.kucuk,
    buyuk: p.buyuk,
    kale: p.kale,
    calisma: p.calisma,
    dinlenme: p.dinlenme,
    mesafe: p.mesafe,
    uzun: p.uzun,
    kural: rule ?? "oyunu akıcı tutun",
  };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? values[k] : m));
}

export function renderDrill(id: string, p: AgeProfile, rule?: string): RenderedDrill {
  const d = DRILLS[id];
  if (!d) throw new Error(`Bilinmeyen egzersiz: ${id}`);
  const f = (s: string) => fill(s, p, rule);
  return {
    ...d,
    goal: f(d.goal),
    setup: f(d.setup),
    how: d.how.map(f),
    points: d.points.map(f),
    easier: f(d.easier),
    harder: f(d.harder),
  };
}

const BASE_MATERIALS = ["Düdük", "Su şişeleri", "İlk yardım çantası"];

/** Aynı malzemeyi farklı egzersizlerden tek satırda toplar (en büyük adet geçerli). */
function collectMaterials(blocks: Block[]): string[] {
  const raw = new Set<string>();
  for (const b of blocks) for (const m of b.drill.materials) raw.add(m);

  let ball = { perChild: false, qty: 0 };
  let cones = 0;
  let miniGoals = 0;
  let bigGoals = 0;
  let bibs = false;
  const others: string[] = [];

  for (const m of Array.from(raw)) {
    const lower = m.toLowerCase();
    const num = Number((lower.match(/\d+/) ?? ["0"])[0]);
    const perUnit = /sayısı kadar|her çocuğa|başına|çocuk sayısı/.test(lower);
    if (/mini kale/.test(lower)) miniGoals = Math.max(miniGoals, num || 2);
    else if (/\bkale\b/.test(lower) && !/eldiven/.test(lower)) bigGoals = Math.max(bigGoals, num || 1);
    else if (/huni/.test(lower)) cones = Math.max(cones, perUnit ? 20 : num || 8);
    else if (/yelek/.test(lower)) bibs = true;
    else if (/^(\d+\s+)?(hafif )?top$|\btop\b/.test(lower) && !/medicine|hafif/.test(lower)) {
      ball = { perChild: ball.perChild || perUnit, qty: Math.max(ball.qty, perUnit ? 0 : num) };
    } else if (!BASE_MATERIALS.includes(m)) others.push(m);
  }

  const result: string[] = [];
  if (ball.perChild) result.push(ball.qty > 0 ? `Top: çocuk sayısı kadar (en az ${Math.max(ball.qty, 6)})` : "Top: çocuk sayısı kadar");
  else if (ball.qty > 0) result.push(`${ball.qty} top`);
  if (cones > 0) result.push(`${cones} huni`);
  if (bibs) result.push("Yelek (2–3 renk, çocuk sayısının yarısı kadar)");
  if (miniGoals > 0) result.push(`${miniGoals} mini kale`);
  if (bigGoals > 0) result.push(`${bigGoals} kale`);
  for (const o of others) if (!result.includes(o)) result.push(o);
  for (const m of BASE_MATERIALS) result.push(m);
  return result;
}

function block(minutes: number, phase: Phase, id: string, p: AgeProfile, rule?: string): Block {
  return { minutes, phase, drill: renderDrill(id, p, rule), rule };
}

function cooldownId(age: number): string {
  return age <= 8 ? "soguma-oyunu" : "soguma-germe";
}

function buildTopic(topic: Topic, week: number, p: AgeProfile): TopicPlan {
  const age = p.age;
  const s = topic.sat;
  const u = topic.sun;

  const satBlocks: Block[] = [
    block(10, "Isınma", resolveSlot(s.warm, age), p),
    block(15, "Konu çalışması", resolveSlot(s.tech1, age), p),
    block(15, "Konu çalışması", resolveSlot(s.tech2, age), p),
    block(15, "Oyun", resolveSlot(s.game, age), p, s.rule),
    block(5, "Soğuma", cooldownId(age), p),
  ];
  const sunBlocks: Block[] = [
    block(10, "Isınma", resolveSlot(u.warm, age), p),
    block(10, "Konu çalışması", resolveSlot(u.tech, age), p),
    block(20, "Oyun", resolveSlot(u.game1, age), p, u.rule1),
    block(15, "Oyun", resolveSlot(u.game2, age), p, u.rule2),
    block(5, "Soğuma", cooldownId(age), p),
  ];

  const mk = (day: "saturday" | "sunday", blocks: Block[]): SessionPlan => ({
    id: `${age}-${week}-${day}`,
    day,
    dayLabel: day === "saturday" ? "Cumartesi" : "Pazar",
    title: topic.title,
    emphasis: day === "saturday" ? "Teknik ağırlıklı: beceriyi öğren ve tekrarla" : "Oyun ağırlıklı: öğrendiğini maçta uygula",
    duration: blocks.reduce((sum, b) => sum + b.minutes, 0),
    players: p.group,
    materials: collectMaterials(blocks),
    blocks,
  });

  return { id: topic.id, week, title: topic.title, why: topic.why, saturday: mk("saturday", satBlocks), sunday: mk("sunday", sunBlocks) };
}

export function getCurriculum(age: number): Curriculum {
  const profile = getAgeProfile(age);
  const ids = AGE_TOPICS[profile.age];
  return { profile, topics: ids.map((id, i) => buildTopic(TOPICS[id], i + 1, profile)) };
}

export const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);
