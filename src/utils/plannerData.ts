/**
 * Data, templat persiapan Nusantara/KUA, tuntunan Fikih Munakahat,
 * serta utilitas perhitungan untuk modul Manajemen Pernikahan.
 */

export type PlannerSectionId =
  | "todo"
  | "budget"
  | "savings"
  | "essentials"
  | "journal"
  | "fiqh";

export interface PlannerSubMenuMeta {
  id: PlannerSectionId;
  label: string;
  shortLabel: string;
  desc: string;
  keywords: string;
}

export const PLANNER_SUBMENUS: PlannerSubMenuMeta[] = [
  {
    id: "todo",
    label: "To-Do & Persiapan",
    shortLabel: "To-Do",
    desc: "Pantau daftar tugas persiapan dari H-6 bulan hingga Hari H beserta PIC dan tenggat.",
    keywords: "todo tugas checklist persiapan jadwal pic",
  },
  {
    id: "budget",
    label: "Anggaran & Vendor",
    shortLabel: "Anggaran",
    desc: "Catat estimasi harga, biaya deal vendor, status DP/lunas, serta kontak WhatsApp vendor.",
    keywords: "anggaran budget harga biaya vendor dp lunas pembayaran",
  },
  {
    id: "savings",
    label: "Tabungan Menuju Halal",
    shortLabel: "Tabungan",
    desc: "Dompet nikah bersama: target dana, riwayat setoran, dan estimasi setoran bulanan.",
    keywords: "tabungan dompet nikah dana target setoran bulanan",
  },
  {
    id: "essentials",
    label: "Mahar, Seserahan & KUA",
    shortLabel: "KUA & Mahar",
    desc: "Kelola daftar mahar, hantaran seserahan beserta harganya, serta kelengkapan berkas KUA.",
    keywords: "mahar seserahan hantaran kua n1 n2 n4 berkas dokumen",
  },
  {
    id: "journal",
    label: "Jurnal Menikah",
    shortLabel: "Jurnal",
    desc: "Ruang refleksi pranikah, visi rumah tangga sakinah, dan catatan perjalanan menuju halal.",
    keywords: "jurnal catatan refleksi pranikah sakinah pasangan",
  },
  {
    id: "fiqh",
    label: "Tuntunan Fikih Nikah",
    shortLabel: "Fikih",
    desc: "Panduan Fikih Munakahat: rukun & syarat sah, lafaz ijab kabul, mahar, doa, dan alur KUA.",
    keywords: "fikih fiqih munakahat rukun syarat wali ijab kabul doa walimah",
  },
];

export interface PlannerTodo {
  id: number;
  title: string;
  phase: string;
  category: string;
  due_date: string;
  pic: string;
  done: number;
  notes: string;
  created_at: string;
}

export interface PlannerBudgetItem {
  id: number;
  name: string;
  category: string;
  estimated_cost: number;
  actual_cost: number;
  paid_amount: number;
  payment_status: "belum" | "dp" | "cicilan" | "lunas";
  vendor_phone: string;
  due_date: string;
  notes: string;
  created_at: string;
}

export interface PlannerSaving {
  id: number;
  entry_date: string;
  contributor: string;
  entry_type: "setor" | "tarik";
  amount: number;
  note: string;
  created_at: string;
}

export interface PlannerEssential {
  id: number;
  kind: "mahar" | "seserahan" | "kua";
  title: string;
  price: number;
  status: "rencana" | "dibeli" | "siap";
  owner: string;
  done_groom: number;
  done_bride: number;
  notes: string;
  created_at: string;
}

export interface PlannerJournalEntry {
  id: number;
  entry_date: string;
  author: string;
  mood: "bersyukur" | "bahagia" | "haru" | "reflektif" | "bersemangat";
  title: string;
  content: string;
  created_at: string;
}

export const TODO_PHASES = [
  "H-6 Bulan",
  "H-3 Bulan",
  "H-1 Bulan",
  "H-1 Minggu",
  "Hari H",
] as const;

export const TODO_CATEGORIES = [
  "KUA & Berkas",
  "Venue & Katering",
  "Busana & Rias",
  "Dokumentasi",
  "Mahar & Seserahan",
  "Tamu & Undangan",
  "Keluarga & Adat",
  "Umum",
] as const;

export const BUDGET_CATEGORIES = [
  "Venue & Gedung",
  "Katering & Konsumsi",
  "Dekorasi & Pelaminan",
  "Busana & MUA",
  "Dokumentasi (Foto/Video)",
  "Mahar & Seserahan",
  "KUA & Administrasi",
  "Undangan & Souvenir",
  "MC, Hiburan & WO",
  "Lainnya",
] as const;

export const JOURNAL_MOODS = [
  { id: "bersyukur", label: "Bersyukur" },
  { id: "bahagia", label: "Bahagia" },
  { id: "haru", label: "Haru" },
  { id: "reflektif", label: "Reflektif" },
  { id: "bersemangat", label: "Bersemangat" },
] as const;

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  return `${sign}Rp${abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function computeTodoSummary(todos: Pick<PlannerTodo, "done">[]) {
  const total = todos.length;
  const completed = todos.filter((t) => t.done === 1).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending: total - completed, percent };
}

export function computeBudgetSummary(
  items: Pick<
    PlannerBudgetItem,
    "estimated_cost" | "actual_cost" | "paid_amount"
  >[]
) {
  let totalEstimated = 0;
  let totalActual = 0;
  let totalPaid = 0;

  for (const item of items) {
    const est = Math.max(0, Number(item.estimated_cost) || 0);
    const act = Math.max(0, Number(item.actual_cost) || 0);
    const paid = Math.max(0, Number(item.paid_amount) || 0);
    totalEstimated += est;
    totalActual += act > 0 ? act : est;
    totalPaid += paid;
  }

  const remaining = Math.max(0, totalActual - totalPaid);
  const paidPercent =
    totalActual > 0
      ? Math.min(100, Math.round((totalPaid / totalActual) * 100))
      : 0;

  return {
    totalEstimated,
    totalActual,
    totalPaid,
    remaining,
    paidPercent,
  };
}

export function computeSavingsSummary(
  entries: Pick<PlannerSaving, "entry_type" | "amount" | "contributor">[],
  targetAmount: number,
  weddingDateIso?: string,
  nowMs: number = Date.now()
) {
  let totalDeposit = 0;
  let totalWithdraw = 0;
  const byContributor: Record<string, number> = {};

  for (const e of entries) {
    const amt = Math.max(0, Number(e.amount) || 0);
    const key = (e.contributor || "Bersama").trim() || "Bersama";
    if (e.entry_type === "tarik") {
      totalWithdraw += amt;
      byContributor[key] = (byContributor[key] || 0) - amt;
    } else {
      totalDeposit += amt;
      byContributor[key] = (byContributor[key] || 0) + amt;
    }
  }

  const balance = Math.max(0, totalDeposit - totalWithdraw);
  const safeTarget = Math.max(0, Number(targetAmount) || 0);
  const remaining = Math.max(0, safeTarget - balance);
  const percent =
    safeTarget > 0
      ? Math.min(100, Math.round((balance / safeTarget) * 100))
      : 0;

  let monthsLeft = 0;
  let monthlyNeeded = remaining;
  if (weddingDateIso) {
    const targetMs = Date.parse(weddingDateIso);
    if (!Number.isNaN(targetMs) && targetMs > nowMs) {
      const daysLeft = Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24));
      monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
      monthlyNeeded = Math.ceil(remaining / monthsLeft);
    }
  }

  return {
    totalDeposit,
    totalWithdraw,
    balance,
    target: safeTarget,
    remaining,
    percent,
    monthsLeft,
    monthlyNeeded,
    byContributor,
  };
}

export const TODO_STARTER_TEMPLATE: Array<{
  title: string;
  phase: string;
  category: string;
  pic: string;
  notes: string;
}> = [
  {
    title: "Musyawarah keluarga penentuan tanggal akad & resepsi",
    phase: "H-6 Bulan",
    category: "Keluarga & Adat",
    pic: "Bersama",
    notes:
      "Sepakati konsep acara, lokasi, dan estimasi jumlah tamu kedua keluarga.",
  },
  {
    title: "Menetapkan anggaran induk & mulai setoran tabungan nikah",
    phase: "H-6 Bulan",
    category: "Umum",
    pic: "Bersama",
    notes: "Pisahkan dana mahar, akad, katering, dan dana darurat minimal 10%.",
  },
  {
    title: "Survei & kunci jadwal gedung/lokasi serta katering utama",
    phase: "H-6 Bulan",
    category: "Venue & Katering",
    pic: "Bersama",
    notes:
      "Pastikan kapasitas parkir, ruang rias, dan fasilitas ibadah memadai.",
  },
  {
    title: "Memilih vendor dokumentasi (foto & video) serta dekorasi",
    phase: "H-3 Bulan",
    category: "Dokumentasi",
    pic: "Bersama",
    notes:
      "Cek portofolio, jam kerja, serta tenggat pelunasan masing-masing vendor.",
  },
  {
    title: "Menyiapkan mahar (maskawin) & daftar hantaran seserahan",
    phase: "H-3 Bulan",
    category: "Mahar & Seserahan",
    pic: "Calon Suami",
    notes: "Diskusikan kebutuhan seserahan yang bermanfaat agar tidak mubazir.",
  },
  {
    title: "Mengurus surat pengantar RT/RW & formulir N1, N2, N4 di Kelurahan",
    phase: "H-1 Bulan",
    category: "KUA & Berkas",
    pic: "Bersama",
    notes:
      "Lengkapi KTP, KK, akta lahir, ijazah, serta pas foto latar biru 2×3 & 4×6.",
  },
  {
    title: "Pendaftaran nikah online di SIMKAH Web & skrining Elsimil BKKBN",
    phase: "H-1 Bulan",
    category: "KUA & Berkas",
    pic: "Bersama",
    notes:
      "Daftar di simkah4.kemenag.go.id min. 10 hari kerja sebelum akad; ikuti Bimwin & setor PNBP Rp600.000 via kode billing bila akad di luar KUA.",
  },
  {
    title: "Konfirmasi wali nikah, dua saksi adil & pembacaan doa",
    phase: "H-1 Bulan",
    category: "KUA & Berkas",
    pic: "Keluarga",
    notes:
      "Pastikan urutan wali nasab sesuai syariat dan saksi siap hadir tepat waktu.",
  },
  {
    title: "Finalisasi daftar tamu & sebar undangan WhatsApp + cetak PDF",
    phase: "H-1 Bulan",
    category: "Tamu & Undangan",
    pic: "Bersama",
    notes:
      "Gunakan menu Kirim WhatsApp agar tamu menerima PDF undangan & QR Check-In.",
  },
  {
    title: "Fitting akhir busana akad & resepsi kedua mempelai serta orang tua",
    phase: "H-1 Minggu",
    category: "Busana & Rias",
    pic: "Calon Istri",
    notes: "Periksa kelengkapan aksesori, sepatu, dan cadangan peniti/jarum.",
  },
  {
    title: "Technical meeting bersama WO/panitia keluarga & pelunasan vendor",
    phase: "H-1 Minggu",
    category: "Umum",
    pic: "WO / Panitia",
    notes: "Bagikan rundown Hari H, daftar PIC, dan kontak seluruh vendor.",
  },
  {
    title: "Latihan lafaz ijab kabul, cek mahar, cincin & berkas KUA asli",
    phase: "Hari H",
    category: "KUA & Berkas",
    pic: "Calon Suami",
    notes:
      "Istirahat cukup di malam sebelumnya dan perbanyak doa ketenangan hati.",
  },
];

export const BUDGET_STARTER_TEMPLATE: Array<{
  name: string;
  category: string;
  estimated_cost: number;
  notes: string;
}> = [
  {
    name: "Administrasi KUA / Penghulu (Luar Kantor)",
    category: "KUA & Administrasi",
    estimated_cost: 600000,
    notes:
      "Rp0 jika di kantor KUA jam kerja; Rp600.000 PNBP resmi jika di luar KUA.",
  },
  {
    name: "Mahar (Maskawin) Pernikahan",
    category: "Mahar & Seserahan",
    estimated_cost: 5000000,
    notes: "Emas/logam mulia, uang tunai, atau seperangkat alat salat.",
  },
  {
    name: "Paket Seserahan & Jasa Hias Kotak",
    category: "Mahar & Seserahan",
    estimated_cost: 4000000,
    notes:
      "Perlengkapan ibadah, busana, perawatan diri, dan bingkisan keluarga.",
  },
  {
    name: "Sewa Gedung / Lokasi Acara",
    category: "Venue & Gedung",
    estimated_cost: 12000000,
    notes: "Termasuk kursi, sound system dasar, dan kebersihan.",
  },
  {
    name: "Katering & Gubukan Tamu",
    category: "Katering & Konsumsi",
    estimated_cost: 25000000,
    notes: "Sesuaikan porsi berdasarkan estimasi pax dari tab Data RSVP.",
  },
  {
    name: "Dekorasi Pelaminan & Area Akad",
    category: "Dekorasi & Pelaminan",
    estimated_cost: 10000000,
    notes: "Pelaminan, meja akad, pergola pintu masuk, dan meja penerima tamu.",
  },
  {
    name: "MUA, Busana Pengantin & Orang Tua",
    category: "Busana & MUA",
    estimated_cost: 9000000,
    notes:
      "Rias akad + resepsi, busana mempelai, orang tua, dan pager ayu/bagus.",
  },
  {
    name: "Dokumentasi Foto, Video & Album",
    category: "Dokumentasi (Foto/Video)",
    estimated_cost: 6500000,
    notes: "Liputan akad & resepsi, video cinematic, dan cetak album kolase.",
  },
  {
    name: "Souvenir & Undangan Cetak/Digital",
    category: "Undangan & Souvenir",
    estimated_cost: 2500000,
    notes:
      "Souvenir tamu yang bermanfaat + cetak undangan khusus kerabat sepuh.",
  },
  {
    name: "MC, WO / Panitia & Dana Cadangan",
    category: "MC, Hiburan & WO",
    estimated_cost: 5000000,
    notes:
      "Koordinasi hari H, konsumsi panitia, dan cadangan keperluan mendadak.",
  },
];

export const ESSENTIALS_STARTER_TEMPLATE: Array<{
  kind: "mahar" | "seserahan" | "kua";
  title: string;
  price: number;
  owner: string;
  notes: string;
}> = [
  // Mahar
  {
    kind: "mahar",
    title: "Logam Mulia / Perhiasan Emas",
    price: 4500000,
    owner: "Calon Suami",
    notes: "Hak mutlak istri sesuai kesepakatan bersama.",
  },
  {
    kind: "mahar",
    title: "Seperangkat Alat Salat & Al-Qur'an",
    price: 500000,
    owner: "Calon Suami",
    notes: "Mukena, sajadah, tasbih, dan mushaf Al-Qur'an.",
  },
  // Seserahan
  {
    kind: "seserahan",
    title: "Busana & Kain Kebaya / Gamis",
    price: 1200000,
    owner: "Calon Suami",
    notes: "Sesuai ukuran & selera calon istri.",
  },
  {
    kind: "seserahan",
    title: "Sepatu, Tas & Aksesori",
    price: 1000000,
    owner: "Calon Suami",
    notes: "Pilih model yang nyaman dipakai sehari-hari.",
  },
  {
    kind: "seserahan",
    title: "Perawatan Diri & Kosmetik",
    price: 850000,
    owner: "Calon Suami",
    notes: "Skincare dan perlengkapan mandi sesuai merek rutin.",
  },
  {
    kind: "seserahan",
    title: "Buah Segar & Kue Tradisional Nusantara",
    price: 450000,
    owner: "Keluarga Pria",
    notes: "Disiapkan H-1 agar tetap segar saat diserahkan.",
  },
  // Berkas KUA
  {
    kind: "kua",
    title: "Surat Pengantar RT/RW setempat",
    price: 0,
    owner: "Keduanya",
    notes: "Syarat awal mengurus blangko nikah di Kelurahan/Desa.",
  },
  {
    kind: "kua",
    title: "Formulir Model N1 (Surat Pengantar Nikah)",
    price: 0,
    owner: "Keduanya",
    notes: "Diterbitkan oleh Kelurahan/Desa domisili masing-masing.",
  },
  {
    kind: "kua",
    title: "Formulir Model N2 (Permohonan Kehendak Nikah)",
    price: 0,
    owner: "Keduanya",
    notes: "Memuat data mempelai, jadwal, dan lokasi akad nikah.",
  },
  {
    kind: "kua",
    title: "Formulir Model N4 (Persetujuan Mempelai)",
    price: 0,
    owner: "Keduanya",
    notes: "Ditandatangani kedua calon pengantin atas dasar suka sama suka.",
  },
  {
    kind: "kua",
    title: "Fotokopi KTP, KK, Akta Kelahiran & Ijazah Terakhir",
    price: 0,
    owner: "Keduanya",
    notes: "Siapkan 2–3 rangkap dan bawa dokumen asli saat pemeriksaan KUA.",
  },
  {
    kind: "kua",
    title: "Pas Foto Latar Biru (2×3: 4 lembar, 4×6: 2 lembar)",
    price: 50000,
    owner: "Keduanya",
    notes: "Berbusana sopan dan rapi untuk Buku Nikah.",
  },
  {
    kind: "kua",
    title: "Pendaftaran Online SIMKAH Web (simkah4.kemenag.go.id)",
    price: 0,
    owner: "Bersama",
    notes:
      "Daftar kehendak nikah min. 10 hari kerja sebelum akad untuk jadwal penghulu & Kartu Nikah Digital.",
  },
  {
    kind: "kua",
    title: "Surat Keterangan Sehat Faskes & Sertifikat Elsimil (BKKBN)",
    price: 50000,
    owner: "Keduanya",
    notes:
      "Pemeriksaan kesehatan pranikah di Puskesmas/Klinik/RS & skrining siap nikah Elsimil.",
  },
  {
    kind: "kua",
    title: "Bukti Setor PNBP Nikah di Luar KUA / Luar Jam Kerja (Rp600.000)",
    price: 600000,
    owner: "Bersama",
    notes:
      "Bayar via kode billing resmi ke kas negara (PP 59/2018); Rp0 jika akad di kantor KUA hari & jam kerja.",
  },
];

export const JOURNAL_PROMPTS: Array<{
  title: string;
  prompt: string;
  mood: PlannerJournalEntry["mood"];
}> = [
  {
    title: "Visi Keluarga Sakinah Kami",
    prompt:
      "Seperti apa suasana rumah tangga yang ingin kita bangun dalam 1, 5, dan 10 tahun ke depan? Nilai ibadah dan kebiasaan baik apa yang ingin kita jaga bersama?",
    mood: "bersyukur",
  },
  {
    title: "Kesepakatan Keuangan Setelah Menikah",
    prompt:
      "Bagaimana kita mengatur nafkah harian, tabungan bersama, dana darurat, serta sedekah dan bantuan untuk orang tua kedua belah pihak secara transparan?",
    mood: "reflektif",
  },
  {
    title: "Cara Kami Menyelesaikan Perbedaan Pendapat",
    prompt:
      "Ketika salah satu sedang lelah atau berbeda pandangan, adab komunikasi apa yang kita sepakati agar masalah selesai tanpa saling melukai?",
    mood: "reflektif",
  },
  {
    title: "Bakti Kepada Orang Tua & Mertua",
    prompt:
      "Bagaimana rencana kita menjaga silaturahmi, kunjungan, dan komunikasi yang adil serta penuh hormat kepada kedua orang tua dan keluarga besar?",
    mood: "haru",
  },
  {
    title: "Rencana Tempat Tinggal & Pembagian Peran",
    prompt:
      "Di mana kita berencana tinggal setelah akad, dan bagaimana kita saling meringankan pekerjaan rumah serta mendukung karier/pendidikan masing-masing?",
    mood: "bersemangat",
  },
  {
    title: "Surat Syukur Menjelang Akad Nikah",
    prompt:
      "Tuliskan rasa syukur kepada Allah SWT, terima kasih untuk kedua orang tua, dan doa terbaik untuk pasangan sebelum melangkah ke jenjang pernikahan.",
    mood: "bahagia",
  },
];

export interface FiqhGuideItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  arabic?: string;
  transliteration?: string;
  translation?: string;
  points: string[];
  reference: string;
  referenceUrl?: string;
}

export const FIQH_GUIDES: FiqhGuideItem[] = [
  {
    id: "niat-khitbah",
    category: "Pranikah & Niat",
    title: "Niat Menikah & Adab Khitbah (Meminang)",
    summary:
      "Pernikahan dalam Islam adalah ibadah agung dan perjanjian kokoh (mitsaqan ghalizhan) untuk meraih ketenteraman jiwa (sakinah), cinta (mawaddah), dan kasih sayang (rahmah).",
    arabic:
      "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا لِتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً",
    translation:
      "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.",
    points: [
      "Luruskan niat menikah semata-mata mengharap ridha Allah SWT, menjaga kehormatan diri, dan membangun generasi shalih.",
      "Khitbah (lamaran) merupakan janji menuju akad | belum menghalalkan khalwat (berduaan tanpa mahram) hingga ijab kabul sah terucap.",
      "Dianjurkan melakukan ta'aruf secara terbuka dan jujur terkait kesehatan, kesiapan tanggung jawab, serta visi keluarga dengan pendampingan keluarga/wali.",
    ],
    reference: "QS. Ar-Rum: 21; QS. An-Nisa: 21",
  },
  {
    id: "rukun-syarat",
    category: "Akad Nikah",
    title: "Rukun & Syarat Sah Nikah (Fikih Munakahat)",
    summary:
      "Terdapat lima rukun nikah yang wajib terpenuhi agar akad pernikahan sah menurut syariat Islam (jumhur ulama / mazhab Syafi'i).",
    points: [
      "1. Calon Suami: Beragama Islam, laki-laki tertentu, tidak sedang ihram, tidak memiliki halangan syar'i (bukan mahram).",
      "2. Calon Istri: Beragama Islam, perempuan tertentu, tidak dalam ikatan pernikahan lain atau masa iddah, dan bukan mahram.",
      "3. Wali Nikah (pihak perempuan): Laki-laki muslim, baligh, berakal, adil. Urutan wali nasab: Ayah kandung → Kakek dari jalur ayah → Saudara laki-laki sekandung → Saudara laki-laki seayah → dst. Jika tidak ada atau adlal, beralih ke Wali Hakim (KUA).",
      "4. Dua Orang Saksi: Laki-laki muslim, baligh, berakal, adil, serta menyaksikan dan mendengar langsung lafaz ijab kabul.",
      "5. Shighat (Ijab & Kabul): Ucapan penyerahan dari wali (atau wakilnya) dan penerimaan langsung dari calon suami secara bersambung (ittishal) dengan lafaz nikah/tazwij.",
    ],
    reference: "KHI Pasal 14; Fiqh Sunnah & Mazhab Syafi'i",
  },
  {
    id: "ijab-kabul",
    category: "Akad Nikah",
    title: "Tuntunan Lafaz Ijab & Kabul",
    summary:
      "Lafaz ijab diucapkan oleh wali nikah (atau penghulu yang telah diwakilkan/taukil wali) dan dijawab langsung oleh mempelai pria dalam satu tarikan napas/tanpa jeda lama.",
    arabic:
      "قَبِلْتُ نِكَاحَهَا وَتَزْوِيْجَهَا بِالْمَهْرِ الْمَذْكُوْرِ حَالاً",
    transliteration:
      "Qobiltu nikaahahaa wa tazwiijahaa bil-mahril madzkuuri haalan.",
    translation:
      "Saya terima nikahnya dan kawinnya [Nama Mempelai Wanita binti Nama Ayah] dengan maskawin tersebut dibayar tunai.",
    points: [
      "Boleh diucapkan dalam bahasa Indonesia yang jelas: 'Saya terima nikah dan kawinnya [Nama Mempelai Wanita] binti [Nama Ayah] dengan maskawin tersebut dibayar tunai.'",
      "Jawab dengan suara jelas, tenang, dan tidak tergesa-gesa segera setelah wali selesai mengucapkan ijab.",
      "Jika terjadi salah ucap, akad cukup diulang dengan tenang atas arahan penghulu.",
    ],
    reference: "Tuntunan Akad Nikah Kemenag RI",
  },
  {
    id: "mahar-seserahan",
    category: "Mahar & Hantaran",
    title: "Ketentuan Mahar (Maskawin) & Kedudukan Seserahan",
    summary:
      "Memahami perbedaan mendasar antara mahar yang wajib secara syariat dan seserahan yang merupakan tradisi baik ('urf sahih) di Nusantara.",
    arabic: "وَآتُوا النِّسَاءَ صَدُقَاتِهِنَّ نِحْلَةً",
    translation:
      "Dan berikanlah maskawin (mahar) kepada perempuan (yang kamu nikahi) sebagai pemberian yang penuh kerelaan.",
    points: [
      "Mahar hukumnya WAJIB diberikan suami kepada istri dan menjadi hak milik pribadi istri sepenuhnya.",
      "Sebaik-baik mahar adalah yang mudah, tidak memberatkan calon suami, dan disepakati dengan kerelaan hati.",
      "Seserahan (hantaran) BUKAN rukun maupun syarat sah nikah; hukumnya mubah sebagai bentuk hadiah, penghormatan, dan tradisi baik masyarakat selama tidak berlebihan (israf) atau memaksakan utang.",
    ],
    reference: "QS. An-Nisa: 4; HR. Abu Dawud No. 2117",
  },
  {
    id: "doa-pengantin",
    category: "Doa & Keberkahan",
    title: "Doa-Doa Pernikahan Pilihan",
    summary:
      "Kumpulan doa sunnah untuk memohon keberkahan bagi kedua mempelai dan kehidupan rumah tangga yang sakinah.",
    arabic:
      "بَارَكَ اللهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
    transliteration:
      "Baarakallaahu laka wa baaraka 'alaika wa jama'a bainakumaa fii khair.",
    translation:
      "Semoga Allah memberkahimu di waktu bahagia dan memberkahimu di waktu susah, serta semoga Allah mempersatukan kalian berdua dalam kebaikan.",
    points: [
      "Doa suami saat pertama kali bersama istri (memegang ubun-ubun istri dengan lembut): 'Allahumma inni as'aluka khairaha wa khaira ma jabaltaha 'alaih, wa a'udzubika min syarriha wa syarri ma jabaltaha 'alaih.'",
      "Doa memohon keluarga penyejuk hati (QS. Al-Furqan: 74): 'Rabbana hab lana min azwajina wa dzurriyyatina qurrata a'yun waj'alna lil-muttaqina imama.'",
    ],
    reference: "HR. Abu Dawud No. 2130; QS. Al-Furqan: 74",
  },
  {
    id: "adab-walimah",
    category: "Resepsi & Adab",
    title: "Adab Walimatul 'Ursy (Resepsi Pernikahan)",
    summary:
      "Walimah disunnahkan sebagai bentuk rasa syukur sekaligus pengumuman resmi pernikahan kepada masyarakat luas.",
    points: [
      "Selenggarakan sesuai kemampuan tanpa memaksakan diri atau berutang demi gengsi (hindari israf/pemborosan).",
      "Menerapkan adab menjamu tamu dengan ramah, menyediakan hidangan halal, serta memastikan tidak ada makanan yang terbuang percuma.",
      "Undang kerabat, tetangga, dan kaum dhuafa | bukan hanya kalangan berada saja | agar keberkahan semakin luas.",
      "Jaga waktu salat wajib bagi kedua mempelai, keluarga, panitia, maupun tamu undangan selama rangkaian acara.",
    ],
    reference: "HR. Bukhari No. 5167 & Muslim No. 1427",
  },
  {
    id: "hak-kewajiban",
    category: "Kehidupan Rumah Tangga",
    title: "Hak & Kewajiban Suami Istri (Mu'asyarah bil Ma'ruf)",
    summary:
      "Keseimbangan peran, kasih sayang, dan musyawarah menjadi fondasi keharmonisan keluarga setelah akad terucap.",
    points: [
      "Kewajiban bersama: Saling mempergauli dengan cara yang baik (mu'asyarah bil ma'ruf), menjaga rahasia pasangan, saling menasihati dalam ketaatan, dan berbakti kepada orang tua kedua belah pihak.",
      "Kewajiban suami: Memberi nafkah halal lahir dan batin sesuai kemampuan, membimbing keluarga dalam kebaikan, serta melindungi kehormatan istri.",
      "Kewajiban istri: Menghormati kepemimpinan suami dalam kebaikan, menjaga amanah harta dan kehormatan rumah tangga, serta menjadi penenteram hati.",
    ],
    reference: "QS. An-Nisa: 19; QS. Al-Baqarah: 228",
  },
  {
    id: "alur-kua",
    category: "Administrasi Negara",
    title: "Alur Resmi Pendaftaran Nikah KUA (PMA No. 30 Tahun 2024)",
    summary:
      "Pencatatan pernikahan resmi di KUA berdasarkan PMA No. 30 Tahun 2024 melindungi hak hukum suami, istri, dan keturunan serta menerbitkan Buku Nikah & Kartu Nikah Digital.",
    points: [
      "1. Persyaratan Usia & Izin: Usia minimal catin 19 tahun (UU No. 16 Tahun 2019). Jika berusia di bawah 21 tahun wajib melampirkan izin tertulis orang tua (Model N5); jika di bawah 19 tahun wajib dispensasi Pengadilan Agama.",
      "2. Berkas Kelurahan/Desa: Minta pengantar RT/RW untuk mengurus Surat Pengantar Nikah (N1), Permohonan Kehendak Nikah (N2), dan Persetujuan Mempelai (N4), plus fotokopi KTP, KK, Akta Kelahiran, pas foto latar biru, dan Surat Keterangan Sehat Faskes + skrining Elsimil BKKBN.",
      "3. Pendaftaran Digital SIMKAH: Daftar kehendak nikah minimal 10 hari kerja sebelum akad melalui portal resmi SIMKAH Web (simkah4.kemenag.go.id), lalu ikuti pemeriksaan nikah & Bimbingan Perkawinan (Bimwin).",
      "4. Tarif Resmi PNBP (PP No. 59 Tahun 2018): Rp0 (gratis) bila akad di kantor KUA pada hari & jam kerja (Senin–Jumat); Rp600.000 bila akad di luar KUA atau di luar jam kerja (dibayar melalui kode billing resmi ke kas negara, bukan tunai ke petugas). Tersedia tarif Rp0 khusus warga tidak mampu/korban bencana dengan surat keterangan sah.",
    ],
    reference:
      "PMA No. 30 Tahun 2024, UU No. 16 Tahun 2019, & PP No. 59 Tahun 2018",
    referenceUrl: "https://simkah4.kemenag.go.id",
  },
];
