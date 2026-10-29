import React, { useState, useMemo } from "react";
import { 
  CalendarClock, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Search, 
  Calendar as CalendarIcon, 
  Wand2, 
  FileText, 
  Check, 
  Trash2, 
  Edit, 
  ArrowRight, 
  Bell, 
  Zap, 
  Printer, 
  Download, 
  Layers,
  ChevronRight,
  Info,
  X,
  Tag,
  ListTodo
} from "lucide-react";
import { JadwalPengingat, Mapel, Jadwal, Pengaturan } from "../types";
import { saveDocument, deleteDocument, batchSaveDocuments, COLLECTIONS } from "../lib/firebase";
import { notifySimpanSuccess, notifyHapusSuccess, confirmDeleteAlert, notifyCetakSuccess } from "../lib/swal";

interface PenjadwalanOtomatisViewProps {
  pengingatList?: JadwalPengingat[];
  mapelList?: Mapel[];
  jadwalList?: Jadwal[];
  config: Pengaturan;
  onNavigate: (tab: string) => void;
}

export const PenjadwalanOtomatisView: React.FC<PenjadwalanOtomatisViewProps> = ({
  pengingatList = [],
  mapelList = [],
  jadwalList = [],
  config,
  onNavigate
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"daftar" | "generator" | "kalender">("daftar");
  
  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [selectedPrioritas, setSelectedPrioritas] = useState<string>("Semua");

  // Modal State for Manual Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPengingat | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<JadwalPengingat>>({
    judul: "",
    kategori: "Pengumpulan Nilai",
    tenggatWaktu: new Date().toISOString().split("T")[0],
    jam: "23:59",
    prioritas: "Tinggi",
    status: "Belum Selesai",
    pengingatHMin: 3,
    catatan: "",
    linkMenu: "penilaian"
  });

  // Generator State
  const [genTahunAjaran, setGenTahunAjaran] = useState("2026/2027");
  const [genSemester, setGenSemester] = useState("Ganjil");
  const [genMapel, setGenMapel] = useState(mapelList?.[0]?.namaMapel || "Informatika");
  const [genTanggalMulai, setGenTanggalMulai] = useState(new Date().toISOString().split("T")[0]);
  const [genPilihanTugas, setGenPilihanTugas] = useState({
    rppMingguan: true,
    nilaiFormatif: true,
    nilaiUTS: true,
    nilaiUAS: true,
    rekapAbsensi: true,
    jurnalAgenda: true
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper date calculations
  const todayStr = new Date().toISOString().split("T")[0];

  const calculateDaysRemaining = (dueDateStr: string) => {
    const due = new Date(dueDateStr + "T00:00:00");
    const today = new Date(todayStr + "T00:00:00");
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Enriched list with dynamic status evaluation
  const enrichedList = useMemo(() => {
    return pengingatList.map((item) => {
      const days = calculateDaysRemaining(item.tenggatWaktu);
      let calculatedStatus = item.status;
      if (item.status !== "Selesai") {
        if (days < 0) {
          calculatedStatus = "Terlewat";
        }
      }
      return {
        ...item,
        daysRemaining: days,
        computedStatus: calculatedStatus
      };
    });
  }, [pengingatList, todayStr]);

  // Filtered List
  const filteredList = useMemo(() => {
    return enrichedList.filter((item) => {
      const matchSearch = item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.catatan && item.catatan.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchKategori = selectedKategori === "Semua" || item.kategori === selectedKategori;
      const matchStatus = selectedStatus === "Semua" || item.computedStatus === selectedStatus;
      const matchPrioritas = selectedPrioritas === "Semua" || item.prioritas === selectedPrioritas;
      return matchSearch && matchKategori && matchStatus && matchPrioritas;
    });
  }, [enrichedList, searchTerm, selectedKategori, selectedStatus, selectedPrioritas]);

  // Statistics
  const totalTasks = enrichedList.length;
  const completedTasks = enrichedList.filter((i) => i.computedStatus === "Selesai").length;
  const urgentTasks = enrichedList.filter((i) => i.computedStatus !== "Selesai" && i.daysRemaining >= 0 && i.daysRemaining <= 3).length;
  const overdueTasks = enrichedList.filter((i) => i.computedStatus === "Terlewat").length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      judul: "",
      kategori: "Pengumpulan Nilai",
      tenggatWaktu: new Date().toISOString().split("T")[0],
      jam: "23:59",
      prioritas: "Tinggi",
      status: "Belum Selesai",
      pengingatHMin: 3,
      catatan: "",
      linkMenu: "penilaian"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: JadwalPengingat) => {
    setEditingItem(item);
    setFormData({
      judul: item.judul,
      kategori: item.kategori,
      tenggatWaktu: item.tenggatWaktu,
      jam: item.jam || "23:59",
      prioritas: item.prioritas,
      status: item.status,
      pengingatHMin: item.pengingatHMin ?? 3,
      catatan: item.catatan || "",
      linkMenu: item.linkMenu || "penilaian"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.tenggatWaktu) return;

    const id = editingItem ? editingItem.id : "rem_" + Date.now();
    const payload: JadwalPengingat = {
      id,
      judul: formData.judul,
      kategori: (formData.kategori as any) || "Pengumpulan Nilai",
      tenggatWaktu: formData.tenggatWaktu,
      jam: formData.jam || "23:59",
      prioritas: (formData.prioritas as any) || "Sedang",
      status: (formData.status as any) || "Belum Selesai",
      pengingatHMin: Number(formData.pengingatHMin ?? 3),
      catatan: formData.catatan || "",
      linkMenu: formData.linkMenu || "penilaian",
      namaGuru: config.Nama_Guru || "Guru",
      otomatis: editingItem ? editingItem.otomatis : false,
      updatedAt: Date.now()
    };

    await saveDocument(COLLECTIONS.JADWAL_PENGINGAT, id, payload);
    notifySimpanSuccess("Jadwal pengingat berhasil disimpan!");
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (item: JadwalPengingat) => {
    const nextStatus = item.status === "Selesai" ? "Belum Selesai" : "Selesai";
    await saveDocument(COLLECTIONS.JADWAL_PENGINGAT, item.id, {
      ...item,
      status: nextStatus,
      updatedAt: Date.now()
    });
    notifySimpanSuccess(nextStatus === "Selesai" ? "Tugas ditandai selesai! 🎉" : "Status dikembalikan ke Belum Selesai.");
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDeleteAlert("Hapus Pengingat?", "Data pengingat ini akan dihapus dari Firebase.");
    if (confirmed) {
      await deleteDocument(COLLECTIONS.JADWAL_PENGINGAT, id);
      notifyHapusSuccess("Jadwal pengingat berhasil dihapus.");
    }
  };

  // Generate Automatic Schedule for Semester
  const handleGenerateOtomatis = async () => {
    setIsGenerating(true);
    try {
      const itemsToSave: JadwalPengingat[] = [];
      const startDate = new Date(genTanggalMulai);

      // Helper to format Date -> YYYY-MM-DD
      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      let seq = 1;

      // 1. RPP & Modul Ajar Mingguan (4 Minggu ke depan)
      if (genPilihanTugas.rppMingguan) {
        for (let week = 1; week <= 6; week++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + (week * 7) - 2); // Setiap Jumat
          itemsToSave.push({
            id: `auto_rpp_${Date.now()}_${seq++}`,
            judul: `Penyusunan RPP & Modul Ajar ${genMapel} Minggu ke-${week}`,
            kategori: "Pengisian RPP/Modul",
            tenggatWaktu: formatDate(d),
            jam: "16:00",
            prioritas: "Tinggi",
            status: "Belum Selesai",
            pengingatHMin: 2,
            catatan: `Lengkapi modul ajar ${genMapel} untuk KBM minggu ke-${week} (${genTahunAjaran} ${genSemester}).`,
            otomatis: true,
            linkMenu: "modulai",
            namaGuru: config.Nama_Guru
          });
        }
      }

      // 2. Input Nilai Formatif / Harian
      if (genPilihanTugas.nilaiFormatif) {
        for (let tp = 1; tp <= 3; tp++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + (tp * 14)); // Setiap 2 minggu
          itemsToSave.push({
            id: `auto_nil_${Date.now()}_${seq++}`,
            judul: `Input & Rekap Nilai Formatif TP ${tp} - ${genMapel}`,
            kategori: "Pengumpulan Nilai",
            tenggatWaktu: formatDate(d),
            jam: "23:59",
            prioritas: "Tinggi",
            status: "Belum Selesai",
            pengingatHMin: 3,
            catatan: `Unggah nilai tugas/quiz Tujuan Pembelajaran ${tp} mata pelajaran ${genMapel}.`,
            otomatis: true,
            linkMenu: "penilaian",
            namaGuru: config.Nama_Guru
          });
        }
      }

      // 3. Nilai Sumatif Tengah Semester (UTS)
      if (genPilihanTugas.nilaiUTS) {
        const dUts = new Date(startDate);
        dUts.setDate(dUts.getDate() + 45); // Hari ke-45
        itemsToSave.push({
          id: `auto_uts_${Date.now()}_${seq++}`,
          judul: `Batas Akhir Input Nilai Sumatif Tengah Semester (UTS) - ${genMapel}`,
          kategori: "Pengumpulan Nilai",
          tenggatWaktu: formatDate(dUts),
          jam: "23:59",
          prioritas: "Tinggi",
          status: "Belum Selesai",
          pengingatHMin: 5,
          catatan: `Setor dan verifikasi nilai UTS ${genMapel} untuk leger nilai sekolah.`,
          otomatis: true,
          linkMenu: "penilaian",
          namaGuru: config.Nama_Guru
        });
      }

      // 4. Nilai Sumatif Akhir Semester (UAS / Rapor)
      if (genPilihanTugas.nilaiUAS) {
        const dUas = new Date(startDate);
        dUas.setDate(dUas.getDate() + 90); // Hari ke-90
        itemsToSave.push({
          id: `auto_uas_${Date.now()}_${seq++}`,
          judul: `Batas Akhir Input Nilai Akhir Semester (PAS/PAT) & Narasi Rapor - ${genMapel}`,
          kategori: "Pengumpulan Nilai",
          tenggatWaktu: formatDate(dUas),
          jam: "23:59",
          prioritas: "Tinggi",
          status: "Belum Selesai",
          pengingatHMin: 7,
          catatan: `Finalisasi seluruh nilai akhir dan narasi capaian pembelajaran siswa sebelum pencetakan rapor.`,
          otomatis: true,
          linkMenu: "penilaian",
          namaGuru: config.Nama_Guru
        });
      }

      // 5. Rekap Absensi Bulanan
      if (genPilihanTugas.rekapAbsensi) {
        for (let m = 1; m <= 3; m++) {
          const dAbs = new Date(startDate);
          dAbs.setDate(dAbs.getDate() + (m * 30));
          itemsToSave.push({
            id: `auto_abs_${Date.now()}_${seq++}`,
            judul: `Rekapitulasi Presensi Siswa Bulanan (Bulan ke-${m})`,
            kategori: "Absensi & Jurnal",
            tenggatWaktu: formatDate(dAbs),
            jam: "17:00",
            prioritas: "Sedang",
            status: "Belum Selesai",
            pengingatHMin: 2,
            catatan: `Periksa ketidakhadiran (Izin, Sakit, Alpa) dan validasi log presensi bulanan.`,
            otomatis: true,
            linkMenu: "absensi",
            namaGuru: config.Nama_Guru
          });
        }
      }

      // 6. Jurnal Agenda Mengajar
      if (genPilihanTugas.jurnalAgenda) {
        const dAg = new Date(startDate);
        dAg.setDate(dAg.getDate() + 14);
        itemsToSave.push({
          id: `auto_ag_${Date.now()}_${seq++}`,
          judul: `Verifikasi Keterlaksanaan Jurnal Agenda Mengajar KBM`,
          kategori: "Absensi & Jurnal",
          tenggatWaktu: formatDate(dAg),
          jam: "16:00",
          prioritas: "Sedang",
          status: "Belum Selesai",
          pengingatHMin: 1,
          catatan: `Pastikan semua tanggal mengajar dan catatan materi KBM terisi lengkap di Jurnal Agenda.`,
          otomatis: true,
          linkMenu: "agenda",
          namaGuru: config.Nama_Guru
        });
      }

      await batchSaveDocuments(COLLECTIONS.JADWAL_PENGINGAT, itemsToSave);
      notifySimpanSuccess(`Berhasil membuat ${itemsToSave.length} jadwal pengingat otomatis di Firebase!`);
      setActiveSubTab("daftar");
    } catch (err: any) {
      console.error("Error generating schedule:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintSchedule = () => {
    window.print();
    notifyCetakSuccess("Menyiapkan lembar cetak jadwal pengingat...");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner, Summary Cards, and Subtabs (Non-Printable) */}
      <div className="print:hidden space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Otomatisasi Firebase
            </span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black">Penjadwalan Otomatis & Pengingat Tugas Guru</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Atur dan dapatkan notifikasi tenggat waktu pengumpulan nilai, pengisian RPP / Modul Ajar, rekap absensi, serta tugas administratif guru lainnya secara cerdas dan terintegrasi realtime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveSubTab("generator")}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            <span>Generator Otomatis</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengingat</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Tugas</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{totalTasks}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mendekati Tenggat (H-3)</p>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">{urgentTasks}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Terlewat</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">{overdueTasks}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Selesai</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completedTasks} ({completionPercentage}%)</h3>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-2 pb-1">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab("daftar")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === "daftar"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Daftar Tenggat & Pengingat ({filteredList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("generator")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === "generator"
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Wand2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Penjadwalan Otomatis</span>
          </button>

          <button
            onClick={() => setActiveSubTab("kalender")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === "kalender"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Kalender & Timeline</span>
          </button>
        </div>

        <button
          onClick={handlePrintSchedule}
          className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cetak Daftar</span>
        </button>
      </div>
      </div>

      {/* TAB 1: DAFTAR PENGINGAT */}
      {activeSubTab === "daftar" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between print:hidden">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari tugas, tenggat, atau catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedKategori}
                onChange={(e) => setSelectedKategori(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Pengumpulan Nilai">Pengumpulan Nilai</option>
                <option value="Pengisian RPP/Modul">Pengisian RPP/Modul</option>
                <option value="Absensi & Jurnal">Absensi & Jurnal</option>
                <option value="Tugas Administratif">Tugas Administratif</option>
                <option value="Lainnya">Lainnya</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Status</option>
                <option value="Belum Selesai">Belum Selesai</option>
                <option value="Terlewat">Terlewat</option>
                <option value="Selesai">Selesai</option>
              </select>

              <select
                value={selectedPrioritas}
                onChange={(e) => setSelectedPrioritas(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Prioritas</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rendah">Rendah</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <CalendarClock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Jadwal Pengingat</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Belum ada jadwal yang sesuai dengan filter atau Anda dapat membuat jadwal pengingat baru / menggunakan generator otomatis.
              </p>
              <div className="pt-2 flex justify-center space-x-2">
                <button
                  onClick={handleOpenAdd}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-500 transition-all"
                >
                  Tambah Pengingat
                </button>
                <button
                  onClick={() => setActiveSubTab("generator")}
                  className="bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold shadow-xs hover:bg-amber-300 transition-all"
                >
                  Gunakan Generator
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((item) => {
                const isOverdue = item.computedStatus === "Terlewat";
                const isCompleted = item.computedStatus === "Selesai";
                const isUrgent = !isCompleted && item.daysRemaining >= 0 && item.daysRemaining <= 3;

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between space-y-4 ${
                      isCompleted
                        ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 opacity-80"
                        : isOverdue
                        ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/30 dark:bg-rose-950/20"
                        : isUrgent
                        ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {item.kategori}
                        </span>

                        <div className="flex items-center space-x-1 shrink-0">
                          {item.otomatis && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                              Otomatis
                            </span>
                          )}

                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              item.prioritas === "Tinggi"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                : item.prioritas === "Sedang"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {item.prioritas}
                          </span>
                        </div>
                      </div>

                      {/* Title & Notes */}
                      <div>
                        <h4
                          className={`font-extrabold text-sm text-slate-800 dark:text-white leading-snug ${
                            isCompleted ? "line-through text-slate-500 dark:text-slate-400" : ""
                          }`}
                        >
                          {item.judul}
                        </h4>
                        {item.catatan && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.catatan}
                          </p>
                        )}
                      </div>

                      {/* Due date info */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 font-medium">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>{item.tenggatWaktu} {item.jam ? `(${item.jam})` : ""}</span>
                        </div>

                        {/* Countdown Badge */}
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isOverdue
                              ? "bg-rose-600 text-white animate-pulse"
                              : isUrgent
                              ? "bg-amber-400 text-slate-950 font-black"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {isCompleted
                            ? "Selesai"
                            : isOverdue
                            ? `Terlewat ${Math.abs(item.daysRemaining)} hari`
                            : item.daysRemaining === 0
                            ? "Hari Ini!"
                            : `H-${item.daysRemaining}`}
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 gap-2 print:hidden">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                          isCompleted
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isCompleted ? "Batal Selesai" : "Tandai Selesai"}</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        {item.linkMenu && (
                          <button
                            onClick={() => onNavigate(item.linkMenu!)}
                            title="Buka Halaman Modul Terkait"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Pengingat"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Hapus Pengingat"
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERATOR PENJADWALAN OTOMATIS */}
      {activeSubTab === "generator" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 font-extrabold text-sm uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Generator Penjadwalan Otomatis Berbasis Kalender Akademik</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">
              Buat Seluruh Pengingat Administrasi Guru dalam Sekali Klik
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pilih tanggal mulai semester dan tugas yang ingin dijadwalkan. Sistem akan secara otomatis menghitung dan menyimpan jadwal tenggat RPP, nilai, absensi, dan jurnal agenda ke Firebase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mata Pelajaran Utama
              </label>
              <select
                value={genMapel}
                onChange={(e) => setGenMapel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
              >
                {mapelList.length === 0 ? (
                  <option value="Informatika">Informatika</option>
                ) : (
                  mapelList.map((m) => (
                    <option key={m.id} value={m.namaMapel}>
                      {m.namaMapel}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Ajaran & Semester
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={genTahunAjaran}
                  onChange={(e) => setGenTahunAjaran(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  placeholder="2026/2027"
                />
                <select
                  value={genSemester}
                  onChange={(e) => setGenSemester(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Awal Semester / KBM
              </label>
              <input
                type="date"
                value={genTanggalMulai}
                onChange={(e) => setGenTanggalMulai(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Pilih Paket Tugas Administrasi yang Akan Dijadwalkan Otomatis:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genPilihanTugas.rppMingguan}
                  onChange={(e) => setGenPilihanTugas({ ...genPilihanTugas, rppMingguan: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-white">RPP & Modul Ajar Mingguan</p>
                  <p className="text-[10px] text-slate-500">Generasi pengingat setiap Jumat untuk 6 minggu KBM</p>
                </div>
              </label>

              <label className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genPilihanTugas.nilaiFormatif}
                  onChange={(e) => setGenPilihanTugas({ ...genPilihanTugas, nilaiFormatif: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-white">Nilai Formatif / Harian</p>
                  <p className="text-[10px] text-slate-500">Generasi pengingat rekap nilai per 2 minggu</p>
                </div>
              </label>

              <label className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genPilihanTugas.nilaiUTS}
                  onChange={(e) => setGenPilihanTugas({ ...genPilihanTugas, nilaiUTS: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-white">Nilai UTS / Tengah Semester</p>
                  <p className="text-[10px] text-slate-500">Tenggat input & verifikasi leger UTS (Hari ke-45)</p>
                </div>
              </label>

              <label className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genPilihanTugas.nilaiUAS}
                  onChange={(e) => setGenPilihanTugas({ ...genPilihanTugas, nilaiUAS: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-white">Nilai Akhir & Rapor (PAS/PAT)</p>
                  <p className="text-[10px] text-slate-500">Tenggat finalisasi leger & narasi rapor (Hari ke-90)</p>
                </div>
              </label>

              <label className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genPilihanTugas.rekapAbsensi}
                  onChange={(e) => setGenPilihanTugas({ ...genPilihanTugas, rekapAbsensi: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-white">Rekapitulasi Absensi Bulanan</p>
                  <p className="text-[10px] text-slate-500">Generasi pengingat evaluasi presensi per bulan</p>
                </div>
              </label>

              <label className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genPilihanTugas.jurnalAgenda}
                  onChange={(e) => setGenPilihanTugas({ ...genPilihanTugas, jurnalAgenda: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-white">Verifikasi Jurnal Agenda</p>
                  <p className="text-[10px] text-slate-500">Pemeriksaan keterlaksanaan materi KBM</p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              onClick={handleGenerateOtomatis}
              disabled={isGenerating}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-3 rounded-xl text-xs font-black shadow-lg transition-transform active:scale-95 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{isGenerating ? "Menghasilkan Jadwal..." : "Proses & Simpan Jadwal Otomatis ke Firebase"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: KALENDER & TIMELINE */}
      {activeSubTab === "kalender" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                Timeline Tenggat Waktu & Urutan Pengingat
              </h3>
              <p className="text-xs text-slate-500">Urutan tugas berdasarkan tanggal tenggat terdekat</p>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full">
              {enrichedList.length} Total Jadwal
            </span>
          </div>

          <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 pl-6 space-y-6">
            {[...enrichedList]
              .sort((a, b) => a.tenggatWaktu.localeCompare(b.tenggatWaktu))
              .map((item) => {
                const isOverdue = item.computedStatus === "Terlewat";
                const isCompleted = item.computedStatus === "Selesai";

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-[35px] top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-600 text-white"
                          : isOverdue
                          ? "bg-rose-500 border-rose-600 text-white animate-pulse"
                          : "bg-blue-500 border-blue-600 text-white"
                      }`}
                    >
                      {isCompleted ? "✓" : "!"}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            {item.tenggatWaktu} {item.jam ? `(${item.jam})` : ""}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {item.kategori}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mt-1">
                          {item.judul}
                        </h4>
                        {item.catatan && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.catatan}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`text-xs font-extrabold px-3 py-1 rounded-lg ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isOverdue
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {item.computedStatus}
                        </span>

                        {item.linkMenu && (
                          <button
                            onClick={() => onNavigate(item.linkMenu!)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            <span>Buka Modul</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PENGINGAT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                {editingItem ? "Edit Jadwal Pengingat" : "Tambah Jadwal Pengingat Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Tugas / Pengingat *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batas Pengumpulan Nilai UTS Informatik VII A"
                  value={formData.judul || ""}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Tugas
                  </label>
                  <select
                    value={formData.kategori || "Pengumpulan Nilai"}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  >
                    <option value="Pengumpulan Nilai">Pengumpulan Nilai</option>
                    <option value="Pengisian RPP/Modul">Pengisian RPP/Modul</option>
                    <option value="Absensi & Jurnal">Absensi & Jurnal</option>
                    <option value="Tugas Administratif">Tugas Administratif</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={formData.prioritas || "Tinggi"}
                    onChange={(e) => setFormData({ ...formData, prioritas: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  >
                    <option value="Tinggi">Tinggi (Urgent)</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Tenggat *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tenggatWaktu || ""}
                    onChange={(e) => setFormData({ ...formData, tenggatWaktu: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Tenggat
                  </label>
                  <input
                    type="time"
                    value={formData.jam || "23:59"}
                    onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pengingat Awal (H-Min)
                  </label>
                  <select
                    value={formData.pengingatHMin ?? 3}
                    onChange={(e) => setFormData({ ...formData, pengingatHMin: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  >
                    <option value={0}>Hari H Saja</option>
                    <option value={1}>1 Hari Sebelum (H-1)</option>
                    <option value={3}>3 Hari Sebelum (H-3)</option>
                    <option value={7}>1 Minggu Sebelum (H-7)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Menu Aplikasi
                  </label>
                  <select
                    value={formData.linkMenu || "penilaian"}
                    onChange={(e) => setFormData({ ...formData, linkMenu: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white"
                  >
                    <option value="penilaian">Input Penilaian</option>
                    <option value="modulai">Modul Ajar AI</option>
                    <option value="absensi">Input Absensi</option>
                    <option value="agenda">Agenda Mengajar</option>
                    <option value="bimbingan">Bimbingan Guru Wali</option>
                    <option value="laporan">Pusat Laporan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan atau petunjuk teknis..."
                  value={formData.catatan || ""}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
