import type { PublicCompanyInfo } from "@/services/companyService";

/**
 * Hukuki metinler (KVKK Aydınlatma Metni, Açık Rıza Metni, Çerez Politikası).
 * Şirket bilgileri Ayarlar → Şirket ve Banka bölümünden otomatik gelir; girilmeyen alanlar
 * köşeli parantezle işaretli kalır. Metinler ŞABLONDUR: yayına almadan önce bir avukat/KVKK
 * danışmanı incelemelidir. İnceleme bitince LEGAL_DRAFT = false yapın (sayfadaki "taslak" uyarısı kalkar).
 */
export const LEGAL_DRAFT = true;
export const LEGAL_LAST_UPDATED = "Kasım 2026";
/**
 * KVKK metni sürümü. Metin anlamlı şekilde değişince artırılır; veliler yeni sürümü onaylamadan portala giremez.
 * supabase/functions/_shared/parent.ts içindeki CURRENT_KVKK_VERSION ile AYNI olmalıdır.
 */
export const LEGAL_VERSION = "2026-11-v1";

/** Bir blok: string = paragraf, string[] = madde işaretli liste */
export type LegalBlock = string | string[];
export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}
export interface LegalDoc {
  title: string;
  intro?: string;
  sections: LegalSection[];
}

const ph = (value: string | null | undefined, label: string) => (value && value.trim() ? value.trim() : `[${label}]`);

/** Metinde hâlâ doldurulmamış köşeli parantezli alan var mı? (yayın öncesi uyarı için) */
export function hasMissingFields(doc: LegalDoc): boolean {
  const scan = (b: LegalBlock): boolean => (Array.isArray(b) ? b.some(scan) : /\[[^\]]+\]/.test(b));
  return doc.sections.some((s) => s.blocks.some(scan)) || /\[[^\]]+\]/.test(doc.intro ?? "");
}

function controllerBlock(c: PublicCompanyInfo): string[] {
  const rows = [
    `Unvan: ${ph(c.legal_name, "Şirket ticari unvanı")}`,
    `MERSİS No: ${ph(c.mersis_no, "MERSİS no")}`,
    `Adres: ${ph(c.address, "Şirket adresi")}`,
    `Telefon: ${ph(c.phone, "Telefon")}`,
    `E-posta: ${ph(c.email, "E-posta")}`,
    `KEP Adresi: ${ph(c.kep_address, "KEP adresi")}`,
  ];
  if (c.verbis_number && c.verbis_number.trim()) rows.push(`VERBİS Sicil No: ${c.verbis_number.trim()}`);
  if (c.website && c.website.trim()) rows.push(`Web Sitesi: ${c.website.trim()}`);
  return rows;
}

const RIGHTS = [
  "Kişisel verilerinizin işlenip işlenmediğini öğrenme,",
  "Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,",
  "Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,",
  "Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,",
  "Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,",
  "KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme,",
  "Düzeltme, silme veya yok etme işlemlerinin kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme,",
  "İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,",
  "Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
];

/** KVKK Aydınlatma Metni (veli ve öğrenci) */
export function buildKvkkDoc(c: PublicCompanyInfo): LegalDoc {
  const controller = ph(c.legal_name, "Şirket ticari unvanı");
  const contact = ph(c.kvkk_contact_email || c.email, "KVKK başvuru e-postası");

  return {
    title: "KVKK Aydınlatma Metni",
    intro:
      `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") m.10 ile Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, ` +
      `veri sorumlusu sıfatıyla ${controller} ("Okul") tarafından, futbol okulu hizmetlerimizden yararlanan öğrencilerimiz ile velileri/vasileri ` +
      `hakkında işlenen kişisel veriler konusunda sizi bilgilendirmek isteriz.`,
    sections: [
      { title: "1. Veri Sorumlusu", blocks: [controllerBlock(c)] },
      {
        title: "2. İşlenen Kişisel Veriler",
        blocks: [
          "Hizmetin niteliği gereği aşağıdaki kategorilerde kişisel veriler işlenmektedir:",
          [
            "Kimlik bilgileri: öğrencinin ve velinin adı soyadı, öğrencinin doğum tarihi ve yaşı,",
            "İletişim bilgileri: velilerin telefon numaraları, e-posta ve adres bilgileri,",
            "Öğrenci bilgileri: boy, kilo, okul bilgisi, forma/kıyafet bedeni, kayıt başlangıç ve bitiş tarihleri, bağlı olduğu şube ve grup,",
            "Sağlık bilgileri (özel nitelikli): sağlık raporunun teslim edilip edilmediği bilgisi ve gerektiğinde rapor içeriğine ilişkin bilgi,",
            "Eğitim ve performans bilgileri: yoklama/devam kayıtları, performans test sonuçları, gelişim değerlendirmeleri ve raporlar,",
            "Finansal bilgiler: ödeme planı, aidat ve kıyafet ödemeleri, tahsilat ve makbuz kayıtları, ödemede kullanılan yöntem ve banka hesabı bilgisi,",
            "Görsel ve işitsel kayıtlar: antrenman, maç ve etkinliklerde çekilen fotoğraf ve videolar (yalnızca ilgili onayın verilmesi hâlinde),",
            "İletişim kayıtları: Okul tarafından gönderilen bilgilendirme mesajlarının içeriği, gönderim ve teslim durumu,",
            "İşlem güvenliği bilgileri: sisteme giriş kayıtları, IP adresi ve cihaz/tarayıcı bilgisi.",
          ],
        ],
      },
      {
        title: "3. Kişisel Verilerin İşlenme Amaçları",
        blocks: [
          [
            "Öğrenci kayıt ve üyelik işlemlerinin yürütülmesi, şube ve grup planlaması,",
            "Antrenman hizmetinin sunulması, yoklama ve devam takibinin yapılması,",
            "Öğrencinin fiziksel ve teknik gelişiminin ölçülmesi, performans testlerinin değerlendirilmesi ve raporlanması (analizlerde yapay zekâ destekli araçlar kullanılabilir; bu araçlara öğrencinin adı gibi doğrudan kimliğini belirten bilgiler gönderilmez),",
            "Aidat, kıyafet ve diğer ödemelerin takibi, tahsilat, faturalandırma ve muhasebe işlemlerinin yürütülmesi,",
            "Velilerin yoklama, ödeme, performans ve duyurulara ilişkin bilgilendirilmesi (WhatsApp vb. kanallarla),",
            "Öğrencinin antrenmanlara güvenli şekilde katılımının sağlanması,",
            "Hizmet kalitesinin ve bilgi güvenliğinin sağlanması, hata ve kötüye kullanımın önlenmesi,",
            "Hukuki yükümlülüklerin yerine getirilmesi, talep ve şikâyetlerin yönetilmesi, hakların tesisi ve korunması.",
          ],
        ],
      },
      {
        title: "4. Hukuki Sebepler",
        blocks: [
          "Kişisel verileriniz KVKK m.5/2 kapsamında; sözleşmenin kurulması ve ifası için gerekli olması (c), veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (ç), bir hakkın tesisi, kullanılması veya korunması için zorunlu olması (e) ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati için zorunlu olması (f) hukuki sebeplerine dayanılarak işlenmektedir.",
          "Sağlık verileri (özel nitelikli kişisel veri) ile fotoğraf ve video kayıtları, ayrıca yurt dışına aktarım ve ticari elektronik ileti gönderimi açık rızanıza dayanılarak işlenir; bu konulardaki tercihleriniz Açık Rıza Metni ile ayrıca alınır ve her zaman geri alınabilir.",
        ],
      },
      {
        title: "5. Kişisel Verilerin Toplanma Yöntemi",
        blocks: [
          "Kişisel verileriniz; kayıt formları (yazılı ve elektronik), Okul yönetici ve antrenörlerinin sisteme girdiği kayıtlar, veli ile yapılan yazışmalar ve WhatsApp iletişimi, ödeme ve makbuz kayıtları, ileride sunulacak veli erişim sayfası ve sisteme giriş sırasında otomatik yollarla toplanmaktadır.",
        ],
      },
      {
        title: "6. Kişisel Verilerin Aktarılması",
        blocks: [
          "Kişisel verileriniz, yukarıda belirtilen amaçlarla ve KVKK m.8 ile m.9'a uygun olarak şu alıcı gruplarına aktarılabilir:",
          [
            "Yetkili kamu kurum ve kuruluşları ile yargı mercileri (mevzuattan doğan yükümlülükler kapsamında),",
            "Ödeme kuruluşları ve bankalar (online ödeme ve tahsilat işlemleri için),",
            "Mali müşavir, avukat ve denetçiler gibi profesyonel danışmanlar,",
            "Bilgi sistemleri, veri barındırma ve bulut altyapısı sağlayıcıları (Supabase, Vercel gibi),",
            "Mesajlaşma hizmet sağlayıcısı (Meta Platforms / WhatsApp Business),",
            "Yapay zekâ destekli analiz hizmeti sağlayıcısı (kullanılması hâlinde; yalnızca kimliği belirtmeyen performans verileri).",
          ],
          "Bu hizmet sağlayıcıların bir kısmının sunucuları veya şirketleri yurt dışında bulunabilir. Yurt dışına aktarımlar KVKK m.9 kapsamında, yeterlilik kararı, uygun güvenceler veya mevzuatta öngörülen diğer şartlar çerçevesinde; gerekli olduğunda açık rızanıza dayanılarak gerçekleştirilir.",
        ],
      },
      {
        title: "7. Saklama Süresi",
        blocks: [
          "Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca ve ilgili mevzuatta (Türk Ticaret Kanunu, Vergi Usul Kanunu, 6098 sayılı Türk Borçlar Kanunu zamanaşımı hükümleri vb.) öngörülen saklama sürelerince muhafaza edilir. Sürenin sona ermesi hâlinde verileriniz silinir, yok edilir veya anonim hâle getirilir.",
        ],
      },
      {
        title: "8. Çocuklara İlişkin Veriler",
        blocks: [
          "Öğrencilerimiz çoğunlukla 18 yaşından küçüktür. Bu nedenle öğrencilere ait kişisel veriler velisi/vasisi aracılığıyla toplanır ve işlenir; açık rıza gerektiren işlemlerde rıza, veli/vasi tarafından verilir. Çocuğa ait veriler, hizmetin gerektirdiği asgari ölçüde ve ek özenle işlenir.",
        ],
      },
      {
        title: "9. Veri Güvenliği",
        blocks: [
          "Kişisel verilerin hukuka aykırı işlenmesini ve erişilmesini önlemek için teknik ve idari tedbirler alınmaktadır. Bunlar arasında şifreli (HTTPS) bağlantı, kullanıcı rolüne göre yetkilendirme, şube bazlı erişim sınırlaması, kimlik doğrulamalı erişim ve veritabanı erişim kuralları bulunmaktadır. Yalnızca görevi gereği ihtiyaç duyan personel ilgili verilere erişebilir.",
        ],
      },
      {
        title: "10. İlgili Kişinin Hakları (KVKK m.11)",
        blocks: ["KVKK'nın 11. maddesi uyarınca veri sahibi olarak şu haklara sahipsiniz:", RIGHTS],
      },
      {
        title: "11. Başvuru Yöntemi",
        blocks: [
          `Yukarıdaki haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e uygun olarak yazılı şekilde Okul adresine, KEP adresimize veya ${contact} e-posta adresine iletebilirsiniz. Başvurularınız talebin niteliğine göre en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi hâlinde Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret talep edilebilir.`,
          "Başvurunuzun kimliğinizi doğrulamaya elverişli olması ve talebinizi açık şekilde içermesi gerekir.",
        ],
      },
      {
        title: "12. Güncelleme",
        blocks: [
          `Bu metin mevzuat veya hizmetlerimizdeki değişikliklere göre güncellenebilir. Güncel sürüm bu sayfada yayımlanır. Son güncelleme: ${LEGAL_LAST_UPDATED}.`,
        ],
      },
    ],
  };
}

/** Açık Rıza Metni (veli) - her madde ayrı ayrı onaylanır, yazdırılıp imzalatılabilir */
export function buildConsentDoc(c: PublicCompanyInfo): LegalDoc {
  const controller = ph(c.legal_name, "Şirket ticari unvanı");
  const choice = "☐ Onaylıyorum     ☐ Onaylamıyorum";

  return {
    title: "Açık Rıza Metni",
    intro:
      `Veri sorumlusu ${controller} tarafından hazırlanan KVKK Aydınlatma Metni'ni okudum ve anladım. ` +
      `Aşağıdaki konularda, bilgilendirilmiş olarak ve özgür irademle, velisi/vasisi olduğum öğrencinin ve kendi kişisel verilerimin işlenmesine ilişkin tercihlerimi belirtiyorum. ` +
      `Her madde birbirinden bağımsızdır; onay vermemem öğrencinin kaydını veya antrenmanlara katılımını engellemez (ilgili hizmetin onaya bağlı olduğu durumlar hariç). Onayımı istediğim zaman geri alabileceğimi biliyorum.`,
    sections: [
      {
        title: "1. Sağlık Verilerinin İşlenmesi",
        blocks: [
          "Öğrencinin sağlık raporunun teslim edilip edilmediği bilgisinin ve gerektiğinde rapor içeriğinin, antrenmanlara güvenli katılımının sağlanması amacıyla kaydedilmesine ve yetkili Okul personeli tarafından görülmesine onay veriyorum.",
          choice,
        ],
      },
      {
        title: "2. Fotoğraf ve Video Kayıtları",
        blocks: [
          "2.1 Öğrencinin antrenman, maç ve etkinliklerde çekilen fotoğraf ve videolarının Okul içinde saklanmasına ve velilere WhatsApp veya veli erişim sayfası üzerinden paylaşılmasına onay veriyorum.",
          choice,
          "2.2 Bu görüntülerin Okul'un sosyal medya hesaplarında, web sitesinde ve tanıtım materyallerinde yayımlanmasına onay veriyorum.",
          choice,
        ],
      },
      {
        title: "3. İletişim ve Bilgilendirme Mesajları",
        blocks: [
          "3.1 Yoklama, ödeme, performans raporu ve duyurulara ilişkin bilgilendirme mesajlarının telefon numaramıza WhatsApp ile gönderilmesine onay veriyorum.",
          choice,
          "3.2 Kampanya, etkinlik ve tanıtım içerikli ticari elektronik iletilerin (6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında) gönderilmesine onay veriyorum.",
          choice,
        ],
      },
      {
        title: "4. Yurt Dışına Aktarım",
        blocks: [
          "Kişisel verilerimin ve öğrencinin kişisel verilerinin; veri barındırma, bulut altyapısı ve mesajlaşma hizmetleri nedeniyle, KVKK m.9 çerçevesinde yurt dışında bulunan hizmet sağlayıcılara aktarılmasına onay veriyorum.",
          choice,
        ],
      },
      {
        title: "Onay Bilgileri",
        blocks: [
          [
            "Velinin / vasinin adı soyadı: ______________________________",
            "Öğrencinin adı soyadı: ______________________________",
            "Tarih: ____ / ____ / ________",
            "İmza: ______________________________",
          ],
        ],
      },
    ],
  };
}

/** Çerez Politikası */
export function buildCookieDoc(c: PublicCompanyInfo): LegalDoc {
  const controller = ph(c.legal_name, "Şirket ticari unvanı");
  const contact = ph(c.kvkk_contact_email || c.email, "İletişim e-postası");

  return {
    title: "Çerez Politikası",
    intro:
      `Bu politika, ${controller} tarafından işletilen futbol okulu yönetim sisteminde çerezlerin ve benzeri tarayıcı depolama teknolojilerinin nasıl kullanıldığını açıklar.`,
    sections: [
      {
        title: "1. Çerez Nedir?",
        blocks: [
          "Çerezler, bir siteyi ziyaret ettiğinizde cihazınıza kaydedilen küçük metin dosyalarıdır. Benzer amaçla tarayıcının yerel depolama alanı (local storage) da kullanılabilir. Bu politikada ikisi birlikte \"çerez ve benzeri teknolojiler\" olarak anılır.",
        ],
      },
      {
        title: "2. Kullandığımız Teknolojiler",
        blocks: [
          "Sistemimiz yalnızca hizmetin çalışması için zorunlu olan aşağıdaki teknolojileri kullanır:",
          [
            "Oturum bilgisi (kimlik doğrulama): Giriş yaptıktan sonra oturumunuzun açık kalmasını sağlar. Tarayıcının yerel depolamasında saklanır; çıkış yaptığınızda veya oturum süresi dolduğunda silinir. Tür: zorunlu. Taraf: birinci taraf.",
            "Şube tercihi: Yönetici ve yetkili kullanıcıların seçtiği şube filtresini hatırlar. Yalnızca cihazınızda saklanır, sunucuya gönderilmez; tarayıcı verilerini silene kadar kalır. Tür: işlevsellik (zorunlu). Taraf: birinci taraf.",
          ],
        ],
      },
      {
        title: "3. Kullanmadığımız Teknolojiler",
        blocks: [
          "Sistemde reklam, pazarlama, davranışsal analiz, sosyal medya izleme veya üçüncü taraf takip çerezleri kullanılmaz; ziyaretçi davranışı izlenmez ve profil oluşturulmaz.",
        ],
      },
      {
        title: "4. Hukuki Dayanak ve Onay",
        blocks: [
          "Yukarıdaki teknolojiler, istediğiniz hizmetin sunulabilmesi için kesinlikle gerekli olduğundan ve verileriniz yalnızca cihazınızda/hesabınızda tutulduğundan ayrıca onayınız aranmaz (KVKK m.5/2-c ve f). Bu nedenle çerez onay penceresi gösterilmemektedir.",
        ],
      },
      {
        title: "5. Tercihlerinizi Yönetme",
        blocks: [
          "Tarayıcı ayarlarınızdan çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu teknolojileri engellemeniz hâlinde sisteme giriş yapamayabilir veya her açılışta yeniden giriş yapmanız gerekebilir.",
        ],
      },
      {
        title: "6. Değişiklikler",
        blocks: [
          `Sisteme analitik, reklam veya benzeri ek teknolojiler eklenirse bu politika önceden güncellenir ve gerekli olduğu hâllerde açık rızanız alınır. Son güncelleme: ${LEGAL_LAST_UPDATED}.`,
        ],
      },
      {
        title: "7. İletişim",
        blocks: [
          `Çerezler ve kişisel verilerinizin işlenmesi hakkındaki sorularınız için ${contact} adresine yazabilirsiniz. Kişisel verilerinize ilişkin ayrıntılı bilgi için KVKK Aydınlatma Metni'ne bakınız.`,
        ],
      },
    ],
  };
}
