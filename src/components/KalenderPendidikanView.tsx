import React, { useState, useMemo } from "react";
import {
  CalendarRange,
  Printer,
  FileDown,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save,
  X,
  BookOpen,
  Award
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { KaldikEvent, Pengaturan } from "../types";
import { 
  saveDocument, 
  deleteDocument, 
  batchSaveDocuments,
  COLLECTIONS 
} from "../lib/firebase";
import {
  notifySimpanSuccess,
  notifySimpanError,
  notifyHapusSuccess,
  notifyHapusError,
  notifyCetakSuccess,
  notifyCetakError,
  confirmDeleteAlert
} from "../lib/swal";

// Default Category Definitions
export const KATEGORI_KALDIK: Record<
  KaldikEvent["kategori"],
  { label: string; bgClass: string; textClass: string; dotColor: string; pdfColor: [number, number, number] }
> = {
  hari_pertama: {
    label: "Awal Masuk / MPLS",
    bgClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200",
    textClass: "text-amber-700 dark:text-amber-400",
    dotColor: "#f59e0b",
    pdfColor: [245, 158, 11]
  },
  kbm: {
    label: "KBM Efektif",
    bgClass: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200",
    textClass: "text-blue-700 dark:text-blue-400",
    dotColor: "#3b82f6",
    pdfColor: [59, 130, 246]
  },
  pts: {
    label: "Sumatif Tengah Semester (STS/PTS)",
    bgClass: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200",
    textClass: "text-cyan-700 dark:text-cyan-400",
    dotColor: "#06b6d4",
    pdfColor: [6, 182, 212]
  },
  pas: {
    label: "Sumatif Akhir Semester (SAS/SAT)",
    bgClass: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200",
    textClass: "text-indigo-700 dark:text-indigo-400",
    dotColor: "#4f46e5",
    pdfColor: [79, 70, 229]
  },
  rapor: {
    label: "Pembagian Buku Rapor",
    bgClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200",
    textClass: "text-emerald-700 dark:text-emerald-400",
    dotColor: "#10b981",
    pdfColor: [16, 185, 129]
  },
  libur_semester: {
    label: "Libur Akhir Semester",
    bgClass: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
    textClass: "text-slate-600 dark:text-slate-400",
    dotColor: "#64748b",
    pdfColor: [100, 116, 139]
  },
  libur_nasional: {
    label: "Libur Nasional / Keagamaan",
    bgClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200",
    textClass: "text-rose-700 dark:text-rose-400",
    dotColor: "#ef4444",
    pdfColor: [239, 68, 68]
  },
  anbk: {
    label: "ANBK / Ujian Sekolah",
    bgClass: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200",
    textClass: "text-purple-700 dark:text-purple-400",
    dotColor: "#a855f7",
    pdfColor: [168, 85, 247]
  },
  khusus: {
    label: "Kegiatan Khusus Sekolah",
    bgClass: "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950/60 dark:text-pink-200",
    textClass: "text-pink-700 dark:text-pink-400",
    dotColor: "#ec4899",
    pdfColor: [236, 72, 153]
  }
};

// Standard Official Academic Events for 2026/2027
export const PRESET_EVENTS_2026_2027: Omit<KaldikEvent, "id">[] = [
  // SEMESTER GANJIL (JULI - DESEMBER 2026)
  {
    tanggalMulai: "2026-07-13",
    tanggalSelesai: "2026-07-17",
    judul: "Hari Pertama Masuk Sekolah & Masa Pengenalan Lingkungan Sekolah (MPLS)",
    kategori: "hari_pertama",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Penyambutan siswa baru & penyesuaian kelas KBM."
  },
  {
    tanggalMulai: "2026-07-20",
    judul: "Awal KBM Efektif Semester Ganjil",
    kategori: "kbm",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Pembelajaran reguler Kurikulum Merdeka."
  },
  {
    tanggalMulai: "2026-08-17",
    judul: "Upacara Hari Kemerdekaan RI Ke-81",
    kategori: "libur_nasional",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional & Upacara Bendera HUT RI."
  },
  {
    tanggalMulai: "2026-09-04",
    judul: "Maulid Nabi Muhammad SAW 1448 H",
    kategori: "libur_nasional",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional Hari Besar Keagamaan."
  },
  {
    tanggalMulai: "2026-09-07",
    tanggalSelesai: "2026-09-10",
    judul: "Pelaksanaan Asesmen Nasional Berbasis Komputer (ANBK)",
    kategori: "anbk",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Pelaksanaan ANBK Utama & Survei Karakter."
  },
  {
    tanggalMulai: "2026-09-21",
    tanggalSelesai: "2026-09-26",
    judul: "Sumatif Tengah Semester (STS) Ganjil",
    kategori: "pts",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Evaluasi capaian pembelajaran tengah semester ganjil."
  },
  {
    tanggalMulai: "2026-10-28",
    judul: "Peringatan Hari Sumpah Pemuda Ke-98",
    kategori: "khusus",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Upacara bendera & pentas seni pelajar."
  },
  {
    tanggalMulai: "2026-11-10",
    judul: "Peringatan Hari Pahlawan Nasional",
    kategori: "khusus",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Upacara peringatan hari pahlawan."
  },
  {
    tanggalMulai: "2026-11-25",
    judul: "Peringatan Hari Guru Nasional (HGN) & HUT PGRI",
    kategori: "khusus",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Pemberian apresiasi guru & upacara."
  },
  {
    tanggalMulai: "2026-11-30",
    tanggalSelesai: "2026-12-05",
    judul: "Sumatif Akhir Semester (SAS / PAS) Ganjil",
    kategori: "pas",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Asesmen sumatif akhir semester ganjil."
  },
  {
    tanggalMulai: "2026-12-07",
    tanggalSelesai: "2026-12-17",
    judul: "Remedial, Pengolahan Nilai & Class Meeting",
    kategori: "khusus",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Input leger nilai & kegiatan porseni antar kelas."
  },
  {
    tanggalMulai: "2026-12-18",
    judul: "Penyerahan Buku Rapor Semester Ganjil",
    kategori: "rapor",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Pembagian laporan hasil belajar siswa semester ganjil."
  },
  {
    tanggalMulai: "2026-12-21",
    tanggalSelesai: "2027-01-02",
    judul: "Libur Akhir Semester Ganjil",
    kategori: "libur_semester",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Libur pembelajaran akhir semester ganjil."
  },
  {
    tanggalMulai: "2026-12-25",
    judul: "Hari Raya Natal",
    kategori: "libur_nasional",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional Natal."
  },

  // SEMESTER GENAP (JANUARI - JUNI 2027)
  {
    tanggalMulai: "2027-01-01",
    judul: "Tahun Baru Masehi 2027",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional Tahun Baru."
  },
  {
    tanggalMulai: "2027-01-04",
    judul: "Hari Pertama Masuk Sekolah Semester Genap",
    kategori: "hari_pertama",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Awal kegiatan KBM semester genap."
  },
  {
    tanggalMulai: "2027-01-23",
    judul: "Peringatan Isra Mi'raj Nabi Muhammad SAW 1448 H",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional."
  },
  {
    tanggalMulai: "2027-02-06",
    judul: "Tahun Baru Imlek 2578 Kongzili",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional."
  },
  {
    tanggalMulai: "2027-03-08",
    tanggalSelesai: "2027-03-13",
    judul: "Sumatif Tengah Semester (STS) Genap",
    kategori: "pts",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Evaluasi tengah semester genap."
  },
  {
    tanggalMulai: "2027-03-11",
    tanggalSelesai: "2027-03-13",
    judul: "Perkiraan Libur Awal Ramadhan 1448 H",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur awal puasa Ramadhan."
  },
  {
    tanggalMulai: "2027-03-20",
    tanggalSelesai: "2027-03-27",
    judul: "Libur Hari Raya Idul Fitri 1448 H & Cuti Bersama",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Hari Raya Idul Fitri 1448 H."
  },
  {
    tanggalMulai: "2027-03-26",
    judul: "Wafat Yesus Kristus (Jumat Agung)",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional."
  },
  {
    tanggalMulai: "2027-05-02",
    judul: "Peringatan Hari Pendidikan Nasional (Hardiknas)",
    kategori: "khusus",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Upacara bendera & pameran karya siswa."
  },
  {
    tanggalMulai: "2027-05-10",
    tanggalSelesai: "2027-05-15",
    judul: "Asesmen Akhir Jenjang / Ujian Sekolah",
    kategori: "anbk",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Ujian kelulusan tingkat akhir."
  },
  {
    tanggalMulai: "2027-05-20",
    judul: "Peringatan Hari Kebangkitan Nasional (Harkitnas)",
    kategori: "khusus",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Upacara bendera nasional."
  },
  {
    tanggalMulai: "2027-06-01",
    judul: "Hari Lahir Pancasila",
    kategori: "libur_nasional",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur Nasional."
  },
  {
    tanggalMulai: "2027-06-07",
    tanggalSelesai: "2027-06-12",
    judul: "Sumatif Akhir Tahun (SAT / Kenaikan Kelas)",
    kategori: "pas",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Asesmen sumatif penentuan kenaikan kelas."
  },
  {
    tanggalMulai: "2027-06-14",
    tanggalSelesai: "2027-06-24",
    judul: "Remedial, Pengolahan Nilai & Porseni Sekolah",
    kategori: "khusus",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Rapat dewan guru penentuan kenaikan kelas."
  },
  {
    tanggalMulai: "2027-06-25",
    judul: "Penyerahan Buku Rapor Kenaikan Kelas (Semester Genap)",
    kategori: "rapor",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Pembagian laporan hasil belajar semester genap."
  },
  {
    tanggalMulai: "2027-06-28",
    tanggalSelesai: "2027-07-10",
    judul: "Libur Akhir Tahun Ajaran 2026/2027",
    kategori: "libur_semester",
    semester: "genap",
    tahunAjaran: "2026/2027",
    keterangan: "Libur kenaikan kelas siswa."
  }
];

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

interface KalenderPendidikanViewProps {
  kaldikList: KaldikEvent[];
  config: Pengaturan;
}

export const KalenderPendidikanView: React.FC<KalenderPendidikanViewProps> = ({
  kaldikList,
  config
}) => {
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState("2026/2027");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<"semua" | "ganjil" | "genap">("semua");
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState<string>("semua");
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal Form State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KaldikEvent | null>(null);
  const [formData, setFormData] = useState<Omit<KaldikEvent, "id">>({
    tanggalMulai: new Date().toISOString().split("T")[0],
    tanggalSelesai: "",
    judul: "",
    kategori: "khusus",
    semester: "ganjil",
    tahunAjaran: "2026/2027",
    keterangan: ""
  });

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return kaldikList
      .filter((ev) => ev.tahunAjaran === selectedTahunAjaran)
      .filter((ev) => {
        if (selectedSemesterFilter === "semua") return true;
        return ev.semester === selectedSemesterFilter;
      })
      .filter((ev) => {
        if (selectedKategoriFilter === "semua") return true;
        return ev.kategori === selectedKategoriFilter;
      })
      .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
  }, [kaldikList, selectedTahunAjaran, selectedSemesterFilter, selectedKategoriFilter]);

  // Months to display based on academic calendar
  // Academic year starts July (year 1) and ends June (year 2)
  const academicMonths = useMemo(() => {
    const [startYearStr, endYearStr] = selectedTahunAjaran.split("/");
    const startYear = parseInt(startYearStr, 10) || 2026;
    const endYear = parseInt(endYearStr, 10) || 2027;

    const ganjilMonths = [
      { monthIdx: 6, year: startYear, name: "Juli", semester: "ganjil" },
      { monthIdx: 7, year: startYear, name: "Agustus", semester: "ganjil" },
      { monthIdx: 8, year: startYear, name: "September", semester: "ganjil" },
      { monthIdx: 9, year: startYear, name: "Oktober", semester: "ganjil" },
      { monthIdx: 10, year: startYear, name: "November", semester: "ganjil" },
      { monthIdx: 11, year: startYear, name: "Desember", semester: "ganjil" }
    ];

    const genapMonths = [
      { monthIdx: 0, year: endYear, name: "Januari", semester: "genap" },
      { monthIdx: 1, year: endYear, name: "Februari", semester: "genap" },
      { monthIdx: 2, year: endYear, name: "Maret", semester: "genap" },
      { monthIdx: 3, year: endYear, name: "April", semester: "genap" },
      { monthIdx: 4, year: endYear, name: "Mei", semester: "genap" },
      { monthIdx: 5, year: endYear, name: "Juni", semester: "genap" }
    ];

    if (selectedSemesterFilter === "ganjil") return ganjilMonths;
    if (selectedSemesterFilter === "genap") return genapMonths;
    return [...ganjilMonths, ...genapMonths];
  }, [selectedTahunAjaran, selectedSemesterFilter]);

  // Quick lookup of events by Date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, KaldikEvent[]> = {};

    kaldikList
      .filter((ev) => ev.tahunAjaran === selectedTahunAjaran)
      .forEach((ev) => {
        if (!ev.tanggalSelesai || ev.tanggalSelesai === ev.tanggalMulai) {
          if (!map[ev.tanggalMulai]) map[ev.tanggalMulai] = [];
          map[ev.tanggalMulai].push(ev);
        } else {
          // Range of dates
          const start = new Date(ev.tanggalMulai);
          const end = new Date(ev.tanggalSelesai);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split("T")[0];
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(ev);
          }
        }
      });

    return map;
  }, [kaldikList, selectedTahunAjaran]);

  // Calculation of Effective Learning Days (Hari Efektif Belajar - HEB) per month
  const monthlyStats = useMemo(() => {
    return academicMonths.map((m) => {
      const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();
      let sundays = 0;
      let holidayEvents = 0;
      let effectiveDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(m.year, m.monthIdx, day);
        const dayOfWeek = dateObj.getDay(); // 0 is Sunday
        const dateStr = `${m.year}-${String(m.monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const evs = eventsByDate[dateStr] || [];
        const isHoliday = evs.some(
          (e) => e.kategori === "libur_nasional" || e.kategori === "libur_semester"
        );

        if (dayOfWeek === 0) {
          sundays++;
        } else if (isHoliday) {
          holidayEvents++;
        } else {
          effectiveDays++;
        }
      }

      // Estimate effective weeks
      const effectiveWeeks = Math.round((effectiveDays / 6) * 10) / 10;

      return {
        ...m,
        daysInMonth,
        sundays,
        holidayEvents,
        effectiveDays,
        effectiveWeeks
      };
    });
  }, [academicMonths, eventsByDate]);

  // Overall totals
  const totalStats = useMemo(() => {
    return monthlyStats.reduce(
      (acc, curr) => ({
        totalDays: acc.totalDays + curr.daysInMonth,
        totalSundays: acc.totalSundays + curr.sundays,
        totalHolidays: acc.totalHolidays + curr.holidayEvents,
        totalEffectiveDays: acc.totalEffectiveDays + curr.effectiveDays,
        totalEffectiveWeeks: Math.round((acc.totalEffectiveWeeks + curr.effectiveWeeks) * 10) / 10
      }),
      {
        totalDays: 0,
        totalSundays: 0,
        totalHolidays: 0,
        totalEffectiveDays: 0,
        totalEffectiveWeeks: 0
      }
    );
  }, [monthlyStats]);

  // Generate / Seed Automatic Kaldik 2026/2027
  const handleGeneratePresetKaldik = async () => {
    try {
      setIsGenerating(true);
      const itemsToSave = PRESET_EVENTS_2026_2027.map((ev, idx) => ({
        id: `kaldik_${ev.semester}_${idx + 1}_${Date.now()}`,
        ...ev
      }));

      await batchSaveDocuments(COLLECTIONS.KALDIK, itemsToSave);
      notifySimpanSuccess(
        `Berhasil men-generate ${itemsToSave.length} agenda Kalender Pendidikan Tahun Ajaran ${selectedTahunAjaran}!`
      );
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal mengisi kalender pendidikan otomatis.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Add/Edit Modal
  const handleOpenAddModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormData({
      tanggalMulai: dateStr || new Date().toISOString().split("T")[0],
      tanggalSelesai: "",
      judul: "",
      kategori: "khusus",
      semester: selectedSemesterFilter === "genap" ? "genap" : "ganjil",
      tahunAjaran: selectedTahunAjaran,
      keterangan: ""
    });
    setShowEventModal(true);
  };

  const handleOpenEditModal = (ev: KaldikEvent) => {
    setEditingEvent(ev);
    setFormData({
      tanggalMulai: ev.tanggalMulai,
      tanggalSelesai: ev.tanggalSelesai || "",
      judul: ev.judul,
      kategori: ev.kategori,
      semester: ev.semester,
      tahunAjaran: ev.tahunAjaran,
      keterangan: ev.keterangan || ""
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.tanggalMulai) {
      notifySimpanError("Judul kegiatan dan tanggal mulai wajib diisi.");
      return;
    }

    try {
      const id = editingEvent ? editingEvent.id : `kaldik_${Date.now()}`;
      await saveDocument(COLLECTIONS.KALDIK, id, {
        id,
        ...formData
      });

      notifySimpanSuccess(
        editingEvent ? "Agenda kalender berhasil diperbarui!" : "Agenda baru berhasil ditambahkan!"
      );
      setShowEventModal(false);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan agenda kalender.");
    }
  };

  const handleDeleteEvent = async (ev: KaldikEvent) => {
    const isConfirmed = await confirmDeleteAlert(
      `Hapus agenda "${ev.judul}" (${ev.tanggalMulai})?`
    );
    if (!isConfirmed) return;

    try {
      await deleteDocument(COLLECTIONS.KALDIK, ev.id);
      notifyHapusSuccess("Agenda berhasil dihapus dari kalender pendidikan.");
    } catch (err: any) {
      notifyHapusError(err.message || "Gagal menghapus agenda.");
    }
  };

  // 1. Native Print (Print Preview)
  const handlePrint = () => {
    window.print();
  };

  // 2. Export PDF via jsPDF & autoTable
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      const pemerintah = (config.Pemerintah || "PEMERINTAH PROVINSI / KABUPATEN").toUpperCase();
      const sekolah = (config.Nama_Sekolah || "SMP NEGERI 3 KERINCI").toUpperCase();
      const alamat = config.Alamat_Sekolah || "Jalan Pendidikan No. 1";

      // Official Kop Surat
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(pemerintah, centerX, 13, { align: "center" });

      doc.setFontSize(13.5);
      doc.text(sekolah, centerX, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(alamat, centerX, 26, { align: "center" });

      // Double Line
      doc.setLineWidth(0.8);
      doc.line(10, 30, pageWidth - 10, 30);
      doc.setLineWidth(0.2);
      doc.line(10, 31.2, pageWidth - 10, 31.2);

      // Render Logos
      if (config.Logo_Kiri) {
        try {
          doc.addImage(config.Logo_Kiri, "PNG", 14, 10, 18, 18);
        } catch (e) {
          console.warn("Could not add Logo_Kiri to PDF:", e);
        }
      }

      const logoKanan = config.Logo_Kanan || config.Logo_Aplikasi;
      if (logoKanan) {
        try {
          doc.addImage(logoKanan, "PNG", pageWidth - 32, 10, 18, 18);
        } catch (e) {
          console.warn("Could not add Logo_Kanan to PDF:", e);
        }
      }

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const semLabel =
        selectedSemesterFilter === "ganjil"
          ? "SEMESTER GANJIL"
          : selectedSemesterFilter === "genap"
          ? "SEMESTER GENAP"
          : "SEMESTER GANJIL & GENAP";
      doc.text(
        `KALENDER PENDIDIKAN & AGENDA AKADEMIK TAHUN AJARAN ${selectedTahunAjaran}`,
        centerX,
        38,
        { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Periode: ${semLabel} | Hari Belajar Efektif (HEB): ${totalStats.totalEffectiveDays} Hari (${totalStats.totalEffectiveWeeks} Minggu)`, centerX, 43, { align: "center" });

      // Table 1: Rangkuman Hari Efektif Bulanan
      const summaryBody = monthlyStats.map((st, i) => [
        i + 1,
        st.name + " " + st.year,
        st.semester === "ganjil" ? "Ganjil" : "Genap",
        st.daysInMonth,
        st.sundays,
        st.holidayEvents,
        st.effectiveDays,
        st.effectiveWeeks
      ]);

      summaryBody.push([
        "",
        "TOTAL",
        "",
        totalStats.totalDays,
        totalStats.totalSundays,
        totalStats.totalHolidays,
        totalStats.totalEffectiveDays,
        totalStats.totalEffectiveWeeks
      ]);

      autoTable(doc, {
        startY: 48,
        head: [
          [
            "No",
            "Bulan & Tahun",
            "Semester",
            "Jml Hari",
            "Minggu",
            "Libur",
            "Hari Efektif (HEB)",
            "Minggu Efektif"
          ]
        ],
        body: summaryBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          cellPadding: 1.8
        },
        styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
        columnStyles: {
          1: { halign: "left", fontStyle: "bold" },
          6: { fontStyle: "bold", textColor: [16, 120, 80] },
          7: { fontStyle: "bold", textColor: [30, 58, 138] }
        }
      });

      const firstFinalY = (doc as any).lastAutoTable.finalY || 80;

      // Table 2: Uraian Kegiatan / Agenda Akademik
      const eventTableBody = filteredEvents.map((ev, idx) => {
        const tglStr = ev.tanggalSelesai && ev.tanggalSelesai !== ev.tanggalMulai
          ? `${ev.tanggalMulai} s/d ${ev.tanggalSelesai}`
          : ev.tanggalMulai;
        const kat = KATEGORI_KALDIK[ev.kategori]?.label || ev.kategori;
        return [
          idx + 1,
          tglStr,
          ev.judul,
          kat,
          ev.semester === "ganjil" ? "Ganjil" : "Genap",
          ev.keterangan || "-"
        ];
      });

      let eventsStartY = firstFinalY + 6;
      if (eventsStartY > pageHeight - 60) {
        doc.addPage();
        eventsStartY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("URAIAN AGENDA DAN KEGIATAN AKADEMIK SEKOLAH:", 12, eventsStartY - 2);

      autoTable(doc, {
        startY: eventsStartY,
        head: [["No", "Waktu / Tanggal", "Uraian Kegiatan Akademik", "Kategori", "Semester", "Keterangan"]],
        body: eventTableBody,
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          cellPadding: 1.8
        },
        styles: { fontSize: 7, cellPadding: 1.8 },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 38, fontStyle: "bold", halign: "center" },
          2: { cellWidth: 95, fontStyle: "bold" },
          3: { cellWidth: 42, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: "auto" }
        }
      });

      const secondFinalY = (doc as any).lastAutoTable.finalY || 140;

      // Signatures Block
      let sigY = secondFinalY + 12;
      if (sigY > pageHeight - 45) {
        doc.addPage();
        sigY = 20;
      }

      const kepsek = config.Nama_Kepsek || "Hamdani, S.Pd., M.Si.";
      const nipKepsek = config.NIP_Kepsek || "19780514 200212 1 003";
      const namaGuru = config.Nama_Guru || "Drs. Yefri Haryanto, M.Pd.";
      const nipGuru = config.NIP_Guru || "19850312 201001 1 008";
      const tempat = config.Tempat_Tanda_Tangan || "Kerinci";

      const dateStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      // Left Signature (Kepala Sekolah)
      doc.text("Mengetahui,", 25, sigY);
      doc.text("Kepala Sekolah", 25, sigY + 4);

      if (config.TandaTangan_Kepsek && config.Tampilkan_TTD_Kepsek !== false) {
        try {
          doc.addImage(config.TandaTangan_Kepsek, "PNG", 22, sigY + 5, 32, 16);
        } catch (e) {
          console.warn("Could not add TandaTangan_Kepsek to PDF:", e);
        }
      }

      if (config.Stempel_Sekolah && config.Tampilkan_Stempel !== false) {
        try {
          doc.addImage(config.Stempel_Sekolah, "PNG", 14, sigY + 3, 20, 20);
        } catch (e) {
          console.warn("Could not add Stempel_Sekolah to PDF:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text(kepsek, 25, sigY + 23);
      doc.setFont("helvetica", "normal");
      if (nipKepsek) doc.text("NIP. " + nipKepsek, 25, sigY + 27);

      // Right Signature (Guru / Waka Kurikulum)
      const sigRightX = pageWidth - 65;
      doc.text(`${tempat}, ${dateStr}`, sigRightX, sigY, { align: "center" });
      doc.text("Guru Mata Pelajaran / Kurikulum", sigRightX, sigY + 4, { align: "center" });

      if (config.TandaTangan_Guru && config.Tampilkan_TTD_Guru !== false) {
        try {
          doc.addImage(config.TandaTangan_Guru, "PNG", sigRightX - 16, sigY + 5, 32, 16);
        } catch (e) {
          console.warn("Could not add TandaTangan_Guru to PDF:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text(namaGuru, sigRightX, sigY + 23, { align: "center" });
      doc.setFont("helvetica", "normal");
      if (nipGuru) doc.text("NIP. " + nipGuru, sigRightX, sigY + 27, { align: "center" });

      const safeYear = selectedTahunAjaran.replace("/", "_");
      doc.save(`Kalender_Pendidikan_${safeYear}_${selectedSemesterFilter}.pdf`);
      notifyCetakSuccess("Dokumen Kalender Pendidikan resmi berhasil diunduh ke PDF!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Kalender Pendidikan PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ACTION BAR (Hidden in print) */}
      <div className="print:hidden space-y-4">
        {/* Banner Title */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                <CalendarRange className="w-5 h-5" />
              </span>
              <span>Generator & Cetak Kalender Pendidikan (Kaldik)</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Susun dan cetak kalender akademik sekolah per semester maupun 1 tahun penuh, lengkap dengan hari efektif belajar (HEB), minggu efektif, pembagian rapor, jadwal libur, serta Kop Surat dan Tanda Tangan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (Print Preview)</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh PDF Resmi</span>
            </button>

            <button
              onClick={handleGeneratePresetKaldik}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md disabled:opacity-50"
              title="Isi otomatis kalender pendidikan dengan agenda nasional & kurikulum merdeka standar"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "Menyusun..." : "Isi Otomatis 2026/2027"}</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Agenda</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tahun Ajaran:
            </label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="2026/2027">Tahun Ajaran 2026/2027</option>
              <option value="2025/2026">Tahun Ajaran 2025/2026</option>
              <option value="2027/2028">Tahun Ajaran 2027/2028</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Periode Semester:
            </label>
            <select
              value={selectedSemesterFilter}
              onChange={(e) => setSelectedSemesterFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="semua">1 Tahun Penuh (Juli - Juni)</option>
              <option value="ganjil">Semester Ganjil (Juli - Desember)</option>
              <option value="genap">Semester Genap (Januari - Juni)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter Kategori:
            </label>
            <select
              value={selectedKategoriFilter}
              onChange={(e) => setSelectedKategoriFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="semua">Semua Kategori ({kaldikList.length})</option>
              {Object.entries(KATEGORI_KALDIK).map(([kKey, kVal]) => (
                <option key={kKey} value={kKey}>
                  {kVal.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-300">Hari Belajar Efektif:</span>
              <span className="font-black text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg shadow-2xs">
                {totalStats.totalEffectiveDays} Hari ({totalStats.totalEffectiveWeeks} Minggu)
              </span>
            </div>
          </div>
        </div>

        {/* Color Legend (Petunjuk Warna Kegiatan) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Keterangan Kode Warna Kalender Pendidikan:</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(KATEGORI_KALDIK).map(([kKey, kVal]) => (
              <span
                key={kKey}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${kVal.bgClass}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                  style={{ backgroundColor: kVal.dotColor }}
                />
                <span>{kVal.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL SHEET / ON-SCREEN WORKSPACE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-slate-800 print:p-0 print:border-none print:shadow-none print:bg-white text-slate-900 dark:text-slate-100 print:text-black">
        {/* OFFICIAL KOP SURAT SEKOLAH (Without DINAS PENDIDIKAN DAN KEBUDAYAAN) */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-double border-slate-900 dark:border-slate-400 print:border-black mb-6">
          <div className="w-16 sm:w-20 h-16 sm:h-20 shrink-0 flex items-center justify-center">
            {config.Logo_Kiri ? (
              <img
                src={config.Logo_Kiri}
                alt="Logo Kiri"
                className="max-w-full max-h-16 sm:max-h-20 object-contain"
              />
            ) : null}
          </div>

          <div className="text-center flex-1 space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black">
              {config.Pemerintah || "PEMERINTAH PROVINSI / KABUPATEN"}
            </h4>
            <h1 className="text-base sm:text-xl font-black uppercase text-slate-900 dark:text-white print:text-black my-0.5">
              {config.Nama_Sekolah || "SMP NEGERI 3 KERINCI"}
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black">
              {config.Alamat_Sekolah || "Jalan Raya Lintas Sungai Penuh, Telp: (0748) 21102"}
            </p>
          </div>

          <div className="w-16 sm:w-20 h-16 sm:h-20 shrink-0 flex items-center justify-center">
            {config.Logo_Kanan || config.Logo_Aplikasi ? (
              <img
                src={config.Logo_Kanan || config.Logo_Aplikasi}
                alt="Logo Kanan"
                className="max-w-full max-h-16 sm:max-h-20 object-contain"
              />
            ) : null}
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black">
            KALENDER PENDIDIKAN & AGENDA AKADEMIK
          </h2>
          <h3 className="text-xs sm:text-sm font-extrabold uppercase text-blue-700 dark:text-blue-400 print:text-black">
            TAHUN AJARAN {selectedTahunAjaran}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-black">
            {selectedSemesterFilter === "ganjil"
              ? "SEMESTER GANJIL (Juli - Desember)"
              : selectedSemesterFilter === "genap"
              ? "SEMESTER GENAP (Januari - Juni)"
              : "SEMESTER GANJIL & GENAP (1 Tahun Penuh)"}
          </p>
        </div>

        {/* SECTION 1: VISUAL CALENDAR MATRIX (MONTH CARDS GRID) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 print:grid-cols-3 print:gap-3">
          {academicMonths.map((m) => {
            const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();
            const firstDayOfWeek = new Date(m.year, m.monthIdx, 1).getDay(); // 0 is Sunday
            // Indonesian school days: Senin (1) s/d Minggu (0)
            // Shift index so Monday is 0, Sunday is 6
            const startDayShift = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

            const currentStat = monthlyStats.find(
              (s) => s.monthIdx === m.monthIdx && s.year === m.year
            );

            return (
              <div
                key={`${m.year}-${m.monthIdx}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 print:border-black overflow-hidden shadow-2xs flex flex-col"
              >
                {/* Month Card Header */}
                <div className="bg-slate-800 text-white dark:bg-slate-950 px-3 py-2 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-xs uppercase tracking-wider">
                      {m.name} {m.year}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 uppercase">
                      {m.semester}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {currentStat?.effectiveDays || 0} HEB
                  </span>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-[10px] font-black text-center py-1 border-b border-slate-200 dark:border-slate-700 print:border-black text-slate-700 dark:text-slate-300 print:text-black">
                  <span>Sen</span>
                  <span>Sel</span>
                  <span>Rab</span>
                  <span>Kam</span>
                  <span>Jum</span>
                  <span>Sab</span>
                  <span className="text-red-600 print:text-red-700">Min</span>
                </div>

                {/* Calendar Days Matrix */}
                <div className="grid grid-cols-7 p-1.5 gap-1 text-[11px] font-semibold flex-1">
                  {/* Empty cells before 1st day of month */}
                  {Array.from({ length: startDayShift }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateObj = new Date(m.year, m.monthIdx, dayNum);
                    const isSunday = dateObj.getDay() === 0;
                    const dateStr = `${m.year}-${String(m.monthIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                    const dayEvents = eventsByDate[dateStr] || [];
                    const topEvent = dayEvents[0];
                    const katConfig = topEvent ? KATEGORI_KALDIK[topEvent.kategori] : null;

                    return (
                      <div
                        key={`day-${dayNum}`}
                        onClick={() => handleOpenAddModal(dateStr)}
                        className={`h-7 rounded-lg flex flex-col items-center justify-center relative cursor-pointer group transition-all text-[11px] ${
                          topEvent
                            ? katConfig
                              ? `${katConfig.bgClass} font-black shadow-2xs`
                              : "bg-blue-100 text-blue-900 font-bold"
                            : isSunday
                            ? "text-red-600 font-bold bg-red-50/50 dark:bg-red-950/20"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                        }`}
                        title={
                          dayEvents.length > 0
                            ? dayEvents.map((e) => e.judul).join("\n")
                            : `Klik untuk tambah agenda pada ${dateStr}`
                        }
                      >
                        <span>{dayNum}</span>
                        {dayEvents.length > 0 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full absolute bottom-0.5"
                            style={{ backgroundColor: katConfig?.dotColor || "#3b82f6" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* SECTION 2: TABEL HARI EFEKTIF BELAJAR (HEB) & MINGGU EFEKTIF */}
        <div className="mb-8 space-y-2">
          <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-black flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Rincian Rekapitulasi Hari Belajar Efektif (HEB) & Minggu Efektif</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 print:border-black text-xs print:text-[9px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 print:bg-slate-100 text-slate-800 dark:text-slate-200 print:text-black font-black uppercase text-[10px] print:text-[8px]">
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-10">
                    No
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                    Bulan & Tahun
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                    Semester
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                    Jml Hari
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                    Hari Minggu
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                    Hari Libur
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                    Hari Efektif (HEB)
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                    Minggu Efektif
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((st, idx) => (
                  <tr
                    key={`stat-${st.monthIdx}-${st.year}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent"
                  >
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1 font-bold">
                      {st.name} {st.year}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center capitalize">
                      {st.semester}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center">
                      {st.daysInMonth}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center text-red-600">
                      {st.sundays}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center text-rose-600">
                      {st.holidayEvents}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center font-extrabold text-emerald-700 dark:text-emerald-400">
                      {st.effectiveDays} Hari
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-center font-extrabold text-blue-700 dark:text-blue-400">
                      {st.effectiveWeeks} Minggu
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 dark:bg-slate-900 print:bg-slate-100 font-black text-slate-900 dark:text-white print:text-black">
                  <td
                    colSpan={3}
                    className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-right uppercase tracking-wider"
                  >
                    Total Keseluruhan
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                    {totalStats.totalDays}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-red-600">
                    {totalStats.totalSundays}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-rose-600">
                    {totalStats.totalHolidays}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-emerald-700 dark:text-emerald-400">
                    {totalStats.totalEffectiveDays} Hari
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-blue-700 dark:text-blue-400">
                    {totalStats.totalEffectiveWeeks} Minggu
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: DAFTAR AGENDA & TANGGAL PENTING */}
        <div className="mb-8 space-y-2">
          <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-black flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Daftar Uraian Agenda & Tanggal Penting KBM ({filteredEvents.length} Kegiatan)</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 print:border-black text-xs print:text-[9px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 print:bg-slate-100 text-slate-800 dark:text-slate-200 print:text-black font-black uppercase text-[10px] print:text-[8px]">
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-10">
                    No
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-center w-36">
                    Waktu / Tanggal
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                    Uraian Kegiatan Akademik
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-center w-40">
                    Kategori
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-20">
                    Semester
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                    Keterangan
                  </th>
                  <th className="print:hidden border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center w-20">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-slate-300 dark:border-slate-700 p-8 text-center text-slate-400 italic"
                    >
                      Belum ada agenda pada periode ini. Klik tombol "Isi Otomatis 2026/2027" atau "+ Tambah Agenda" di atas.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev, idx) => {
                    const kat = KATEGORI_KALDIK[ev.kategori];
                    const dateDisplay =
                      ev.tanggalSelesai && ev.tanggalSelesai !== ev.tanggalMulai
                        ? `${ev.tanggalMulai} s/d ${ev.tanggalSelesai}`
                        : ev.tanggalMulai;

                    return (
                      <tr
                        key={ev.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent"
                      >
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-mono font-bold">
                          {dateDisplay}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 font-bold">
                          {ev.judul}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${kat?.bgClass}`}
                          >
                            {kat?.label || ev.kategori}
                          </span>
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center capitalize font-semibold">
                          {ev.semester}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-slate-600 dark:text-slate-400 print:text-black">
                          {ev.keterangan || "-"}
                        </td>
                        <td className="print:hidden border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenEditModal(ev)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded cursor-pointer"
                              title="Edit Agenda"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded cursor-pointer"
                              title="Hapus Agenda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: OFFICIAL SIGNATURES & STAMP */}
        <div className="mt-10 grid grid-cols-2 gap-8 text-xs print:text-[9px] text-slate-800 dark:text-slate-200 print:text-black">
          {/* Kepala Sekolah */}
          <div className="text-left space-y-1">
            <p>Mengetahui,</p>
            <p className="font-semibold">Kepala Sekolah</p>

            <div className="h-16 print:h-12 flex items-center relative my-1">
              {config.TandaTangan_Kepsek && config.Tampilkan_TTD_Kepsek !== false ? (
                <img
                  src={config.TandaTangan_Kepsek}
                  alt="TTD Kepsek"
                  className="h-14 print:h-10 max-w-[150px] object-contain relative z-10"
                />
              ) : (
                <div className="h-14 print:h-10" />
              )}

              {config.Stempel_Sekolah && config.Tampilkan_Stempel !== false && (
                <img
                  src={config.Stempel_Sekolah}
                  alt="Stempel Sekolah"
                  className="absolute -left-3 -top-1 w-16 h-16 print:w-12 print:h-12 object-contain z-20 pointer-events-none opacity-90 mix-blend-multiply dark:mix-blend-screen print:mix-blend-multiply"
                  style={{ transform: "rotate(-6deg)" }}
                />
              )}
            </div>

            <p className="font-bold underline uppercase">
              {config.Nama_Kepsek || "Hamdani, S.Pd., M.Si."}
            </p>
            <p className="text-[11px] print:text-[8px] text-slate-500 print:text-black">
              NIP. {config.NIP_Kepsek || "19780514 200212 1 003"}
            </p>
          </div>

          {/* Guru / Waka Kurikulum */}
          <div className="text-right space-y-1">
            <p>
              {config.Tempat_Tanda_Tangan || "Kerinci"},{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}
            </p>
            <p className="font-semibold">Guru Pengampu / Waka Kurikulum</p>

            <div className="h-16 print:h-12 flex items-center justify-end my-1">
              {config.TandaTangan_Guru && config.Tampilkan_TTD_Guru !== false ? (
                <img
                  src={config.TandaTangan_Guru}
                  alt="TTD Guru"
                  className="h-14 print:h-10 max-w-[150px] object-contain ml-auto"
                />
              ) : (
                <div className="h-14 print:h-10 ml-auto" />
              )}
            </div>

            <p className="font-bold underline uppercase">
              {config.Nama_Guru || "Drs. Yefri Haryanto, M.Pd."}
            </p>
            <p className="text-[11px] print:text-[8px] text-slate-500 print:text-black">
              NIP. {config.NIP_Guru || "19850312 201001 1 008"}
            </p>
          </div>
        </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT AGENDA */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>{editingEvent ? "Edit Agenda Kalender" : "Tambah Agenda Kalender"}</span>
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Judul Kegiatan / Agenda *
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData((prev) => ({ ...prev, judul: e.target.value }))}
                  placeholder="Contoh: Sumatif Tengah Semester (STS) Ganjil"
                  className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalMulai}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tanggalMulai: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalSelesai || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tanggalSelesai: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Kategori Agenda *
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData((prev) => ({ ...prev, kategori: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  >
                    {Object.entries(KATEGORI_KALDIK).map(([kKey, kVal]) => (
                      <option key={kKey} value={kKey}>
                        {kVal.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Semester *
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData((prev) => ({ ...prev, semester: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  >
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Keterangan / Catatan Tambahan
                </label>
                <textarea
                  value={formData.keterangan || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Contoh: Seluruh siswa hadir berpakaian batik seragam..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Agenda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
