import React, { useState, useMemo, useRef } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
  CheckCircle2,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  Grid,
  List,
  School,
  UserCheck,
  BookOpen,
  Filter
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Jadwal, Mapel, Siswa, Pengaturan } from "../types";
import { saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import {
  notifySimpanSuccess,
  notifySimpanError,
  notifyEditSuccess,
  notifyEditError,
  notifyHapusSuccess,
  notifyHapusError,
  notifyCetakSuccess,
  notifyCetakError,
  confirmDeleteAlert
} from "../lib/swal";

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const DEFAULT_JADWAL_CONFIG: Pengaturan = {
  Nama_Guru: "Guru Pengampu",
  NIP_Guru: "",
  Pemerintah: "PEMERINTAH PROVINSI",
  Nama_Sekolah: "SMA NEGERI 1 KOTA",
  Alamat_Sekolah: "Jalan Pendidikan No. 1",
  Nama_Kepsek: "Kepala Sekolah, M.Pd.",
  NIP_Kepsek: "",
  Tempat_Tanda_Tangan: "Kota",
  Logo_Kiri: "",
  Logo_Kanan: "",
  Logo_Aplikasi: "",
  TandaTangan_Guru: "",
  TandaTangan_Kepsek: "",
  Stempel_Sekolah: "",
  Tampilkan_TTD_Guru: true,
  Tampilkan_TTD_Kepsek: true,
  Tampilkan_Stempel: true
};

interface JadwalMengajarViewProps {
  jadwalList: Jadwal[];
  mapelList: Mapel[];
  siswaList: Siswa[];
  config?: Pengaturan;
}

export const JadwalMengajarView: React.FC<JadwalMengajarViewProps> = ({
  jadwalList,
  mapelList,
  siswaList,
  config = DEFAULT_JADWAL_CONFIG
}) => {
  const [hari, setHari] = useState("Senin");
  const [jam, setJam] = useState("07:30 - 09:00");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");

  // View Mode: 'list' (Tabel Daftar) or 'matrix' (Matriks Mingguan)
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const [filterHari, setFilterHari] = useState<string>("Semua");

  // Edit Jadwal State
  const [editingJadwal, setEditingJadwal] = useState<Jadwal | null>(null);
  const [editHari, setEditHari] = useState("Senin");
  const [editJam, setEditJam] = useState("");
  const [editKelas, setEditKelas] = useState("");
  const [editMapel, setEditMapel] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  const kelasOptions = useMemo(() => {
    return Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();
  }, [siswaList]);

  // Sort jadwal by day of week then by time
  const sortedJadwal = useMemo(() => {
    return [...jadwalList].sort((a, b) => {
      const dayA = HARI_ORDER.indexOf(a.hari);
      const dayB = HARI_ORDER.indexOf(b.hari);
      if (dayA !== dayB) return dayA - dayB;
      return a.jam.localeCompare(b.jam);
    });
  }, [jadwalList]);

  // Filtered by selected day
  const filteredJadwal = useMemo(() => {
    if (filterHari === "Semua") return sortedJadwal;
    return sortedJadwal.filter((j) => j.hari === filterHari);
  }, [sortedJadwal, filterHari]);

  // Group jadwal by day for matrix view
  const jadwalByDay = useMemo(() => {
    const grouped: Record<string, Jadwal[]> = {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [],
      Jumat: [],
      Sabtu: []
    };

    sortedJadwal.forEach((j) => {
      if (grouped[j.hari]) {
        grouped[j.hari].push(j);
      }
    });

    return grouped;
  }, [sortedJadwal]);

  // Add new schedule
  const handleAddJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelas || !mapel) {
      notifySimpanError("Silakan pilih kelas dan mata pelajaran.");
      return;
    }

    const id = Date.now().toString();
    const newJadwal: Jadwal = {
      id,
      hari,
      jam: jam.trim(),
      kelas,
      mapel
    };

    try {
      await saveDocument(COLLECTIONS.JADWAL, id, newJadwal);
      setJam("07:30 - 09:00");
      notifySimpanSuccess("Jadwal mengajar berhasil ditambahkan!");
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan jadwal.");
    }
  };

  // Start edit
  const handleStartEdit = (j: Jadwal) => {
    setEditingJadwal(j);
    setEditHari(j.hari);
    setEditJam(j.jam);
    setEditKelas(j.kelas);
    setEditMapel(j.mapel);
  };

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJadwal) return;

    if (!editKelas || !editMapel || !editJam.trim()) {
      notifyEditError("Silakan isi Jam, Kelas, dan Mata Pelajaran.");
      return;
    }

    const updated: Jadwal = {
      ...editingJadwal,
      hari: editHari,
      jam: editJam.trim(),
      kelas: editKelas,
      mapel: editMapel
    };

    try {
      await saveDocument(COLLECTIONS.JADWAL, editingJadwal.id, updated);
      setEditingJadwal(null);
      notifyEditSuccess("Jadwal mengajar berhasil diperbarui!");
    } catch (err: any) {
      notifyEditError(err.message || "Gagal memperbarui jadwal.");
    }
  };

  // Delete schedule
  const handleDeleteJadwal = async (id: string) => {
    const isConfirmed = await confirmDeleteAlert(
      "Hapus Jadwal Mengajar?",
      "Apakah Anda yakin ingin menghapus jadwal mengajar ini?"
    );
    if (isConfirmed) {
      try {
        await deleteDocument(COLLECTIONS.JADWAL, id);
        notifyHapusSuccess("Jadwal mengajar berhasil dihapus.");
      } catch (err: any) {
        notifyHapusError(err.message || "Gagal menghapus jadwal.");
      }
    }
  };

  // 1. Direct Print (Window Print)
  const handlePrint = () => {
    window.print();
  };

  // 2. Export PDF via jsPDF & autoTable
  const handleExportPDF = () => {
    if (sortedJadwal.length === 0) {
      notifyCetakError("Belum ada data jadwal mengajar untuk dicetak.");
      return;
    }

    try {
      // Portrait A4
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;

      const pemerintah = (config.Pemerintah || "PEMERINTAH PROVINSI / KABUPATEN").toUpperCase();
      const sekolah = (config.Nama_Sekolah || "SMA NEGERI 1 KOTA").toUpperCase();
      const alamat = config.Alamat_Sekolah || "Jalan Pendidikan No. 1";

      // Official Kop
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(pemerintah, centerX, 13, { align: "center" });

      doc.setFontSize(13.5);
      doc.text(sekolah, centerX, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(alamat, centerX, 26, { align: "center" });

      // Double line
      doc.setLineWidth(0.8);
      doc.line(10, 30, pageWidth - 10, 30);
      doc.setLineWidth(0.2);
      doc.line(10, 31.2, pageWidth - 10, 31.2);

      // Render Kop Logos if present
      if (config.Logo_Kiri) {
        try {
          doc.addImage(config.Logo_Kiri, "PNG", 12, 10, 18, 18);
        } catch (e) {
          console.warn("Could not add Logo_Kiri to PDF:", e);
        }
      }

      const logoKanan = config.Logo_Kanan || config.Logo_Aplikasi;
      if (logoKanan) {
        try {
          doc.addImage(logoKanan, "PNG", pageWidth - 30, 10, 18, 18);
        } catch (e) {
          console.warn("Could not add Logo_Kanan to PDF:", e);
        }
      }

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("JADWAL MENGAJAR GURU TAHUN AJARAN 2026/2027", centerX, 39, { align: "center" });

      // Teacher Metadata box
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Nama Guru    : ${config.Nama_Guru || "Guru Pengampu"}`, 12, 46);
      doc.text(`NIP                 : ${config.NIP_Guru || "-"}`, 12, 51);

      const rightX = pageWidth - 80;
      doc.text(`Total Pertemuan  : ${sortedJadwal.length} Sesi / Minggu`, rightX, 46);
      doc.text(`Tahun Ajaran       : 2026/2027 (Ganjil/Genap)`, rightX, 51);

      // Table body
      const tableBody = sortedJadwal.map((j, idx) => [
        idx + 1,
        j.hari,
        j.jam,
        j.kelas,
        j.mapel,
        "Ruang Kelas"
      ]);

      autoTable(doc, {
        startY: 56,
        head: [["No", "Hari", "Jam Pelajaran (WIB)", "Kelas", "Mata Pelajaran", "Keterangan"]],
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "center",
          cellPadding: 2.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 26, fontStyle: "bold" },
          2: { cellWidth: 38, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 24, halign: "center", fontStyle: "bold" },
          4: { cellWidth: 60, fontStyle: "bold" },
          5: { cellWidth: 32, halign: "center" }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 130;
      const pageHeight = doc.internal.pageSize.getHeight();

      // Signatures
      let sigY = finalY + 16;
      if (sigY > pageHeight - 45) {
        doc.addPage();
        sigY = 20;
      }

      const kepsek = config.Nama_Kepsek || "Nama Kepala Sekolah, M.Pd.";
      const nipKepsek = config.NIP_Kepsek || "19800101 200501 1 001";
      const namaGuru = config.Nama_Guru || "Nama Guru Pengampu";
      const nipGuru = config.NIP_Guru || "19900101 201501 1 002";
      const tempat = config.Tempat_Tanda_Tangan || "Kota";

      const dateStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      // Left Signature (Kepala Sekolah)
      doc.text("Mengetahui,", 20, sigY);
      doc.text("Kepala Sekolah", 20, sigY + 5);

      if (config.TandaTangan_Kepsek && config.Tampilkan_TTD_Kepsek !== false) {
        try {
          doc.addImage(config.TandaTangan_Kepsek, "PNG", 18, sigY + 7, 32, 16);
        } catch (e) {
          console.warn("Could not add TandaTangan_Kepsek to PDF:", e);
        }
      }

      if (config.Stempel_Sekolah && config.Tampilkan_Stempel !== false) {
        try {
          doc.addImage(config.Stempel_Sekolah, "PNG", 12, sigY + 5, 20, 20);
        } catch (e) {
          console.warn("Could not add Stempel_Sekolah to PDF:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text(kepsek, 20, sigY + 28);
      doc.setFont("helvetica", "normal");
      if (nipKepsek) doc.text("NIP. " + nipKepsek, 20, sigY + 33);

      // Right Signature (Guru Pengampu)
      const sigRightX = pageWidth - 65;
      doc.text(`${tempat}, ${dateStr}`, sigRightX, sigY, { align: "center" });
      doc.text("Guru Mata Pelajaran", sigRightX, sigY + 5, { align: "center" });

      if (config.TandaTangan_Guru && config.Tampilkan_TTD_Guru !== false) {
        try {
          doc.addImage(config.TandaTangan_Guru, "PNG", sigRightX - 16, sigY + 7, 32, 16);
        } catch (e) {
          console.warn("Could not add TandaTangan_Guru to PDF:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text(namaGuru, sigRightX, sigY + 28, { align: "center" });
      doc.setFont("helvetica", "normal");
      if (nipGuru) doc.text("NIP. " + nipGuru, sigRightX, sigY + 33, { align: "center" });

      doc.save(`Jadwal_Mengajar_${config.Nama_Guru ? config.Nama_Guru.replace(/[^a-zA-Z0-9]/g, "_") : "Guru"}.pdf`);
      notifyCetakSuccess("Dokumen Jadwal Mengajar resmi berhasil diunduh ke PDF!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Jadwal Mengajar.");
    }
  };

  // 3. Export CSV / Excel
  const handleExportCSV = () => {
    if (sortedJadwal.length === 0) {
      notifyCetakError("Belum ada data jadwal untuk diekspor.");
      return;
    }

    try {
      let csv = `\uFEFF`; // UTF-8 BOM
      csv += `JADWAL MENGAJAR GURU TAHUN AJARAN 2026/2027\n`;
      csv += `Sekolah,${config.Nama_Sekolah || "Sekolah"}\n`;
      csv += `Nama Guru,${config.Nama_Guru || "Guru"}\n`;
      csv += `NIP,${config.NIP_Guru || "-"}\n\n`;
      csv += `No,Hari,Jam Pelajaran,Kelas,Mata Pelajaran\n`;

      sortedJadwal.forEach((j, idx) => {
        csv += `${idx + 1},"${j.hari}","${j.jam}","${j.kelas}","${j.mapel.replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Jadwal_Mengajar_${config.Nama_Guru || "Guru"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifyCetakSuccess("File Jadwal Mengajar (CSV/Excel) berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mengunduh file jadwal CSV.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Banner (Non-Printable) */}
      <div className="print:hidden space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </span>
              <span>Jadwal Mengajar Guru</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Kelola waktu tatap muka KBM harian, ruang kelas, serta cetak jadwal resmi lengkap dengan Kop Surat Sekolah & Tanda Tangan Pengesahan.
            </p>
          </div>

          {/* Action Buttons: Cetak & PDF */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={sortedJadwal.length === 0}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (Print Preview)</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={sortedJadwal.length === 0}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF A4</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={sortedJadwal.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Form Tambah Jadwal Baru */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Tambah Jadwal Mengajar Baru</span>
          </h3>

          <form onSubmit={handleAddJadwal} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hari *</label>
              <select
                value={hari}
                onChange={(e) => setHari(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam Mengajar (WIB) *</label>
              <input
                type="text"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                placeholder="Contoh: 07:30 - 09:00"
                className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelas *</label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                <option value="">Pilih Kelas</option>
                {kelasOptions.length === 0 ? (
                  <option value="" disabled>Belum ada kelas</option>
                ) : (
                  kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mata Pelajaran *</label>
              <select
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                <option value="">Pilih Mapel</option>
                {mapelList.length === 0 ? (
                  <option value="" disabled>Belum ada mapel</option>
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
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Jadwal</span>
              </button>
            </div>
          </form>
        </div>

        {/* Toolbar Display Selector: List vs Matrix */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tampilan:</span>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Daftar Tabel</span>
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Matriks Mingguan</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Hari:</span>
            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="Semua">Semua Hari ({sortedJadwal.length})</option>
              {HARI_ORDER.map((h) => (
                <option key={h} value={h}>
                  {h} ({jadwalList.filter((j) => j.hari === h).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matrix View on Screen */}
        {viewMode === "matrix" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {HARI_ORDER.map((dayName) => {
              const dayItems = jadwalByDay[dayName] || [];
              const isFiltered = filterHari !== "Semua" && filterHari !== dayName;
              if (isFiltered) return null;

              return (
                <div
                  key={dayName}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col"
                >
                  <div className="bg-slate-800 text-white dark:bg-slate-950 px-3.5 py-2 font-black text-xs uppercase flex items-center justify-between">
                    <span>{dayName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px]">
                      {dayItems.length} Sesi
                    </span>
                  </div>

                  <div className="p-3 space-y-2 flex-1">
                    {dayItems.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">
                        Tidak ada jam mengajar
                      </p>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1 relative group hover:border-blue-400 transition-all"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {item.jam}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black">
                              Kelas {item.kelas}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-slate-800 dark:text-white truncate">
                            {item.mapel}
                          </p>

                          <div className="flex items-center justify-end space-x-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteJadwal(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRINTABLE AREA: Official Document Sheet Layout */}
      <div
        ref={printAreaRef}
        id="print-sheet-jadwal-mengajar"
        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white print:text-black print:bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-0 transition-colors"
      >
        {/* Official Kop Surat */}
        <div className="border-b-2 border-double border-slate-900 pb-3 mb-4 print:border-black flex items-center justify-between gap-4">
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
              {config.Nama_Sekolah || "SMA NEGERI 1 KOTA"}
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black">
              {config.Alamat_Sekolah || "Jalan Pendidikan No. 1"}
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

        {/* Document Title & Teacher Information */}
        <div className="text-center mb-5">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black">
            JADWAL MENGAJAR GURU TAHUN AJARAN 2026/2027
          </h2>

          <div className="mt-3 grid grid-cols-2 text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-black max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/60 print:bg-transparent p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-none text-left gap-y-1">
            <div>
              <span className="text-slate-500 font-normal">Nama Guru:</span>{" "}
              <strong>{config.Nama_Guru || "Guru Pengampu"}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-normal">NIP:</span>{" "}
              <strong>{config.NIP_Guru || "-"}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-normal">Beban Mengajar:</span>{" "}
              <strong>{sortedJadwal.length} Sesi Pertemuan / Minggu</strong>
            </div>
            <div>
              <span className="text-slate-500 font-normal">Tahun Ajaran:</span>{" "}
              <strong>2026/2027 (Ganjil/Genap)</strong>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 print:border-black rounded-xl">
          <table className="w-full border-collapse text-xs print:text-[9px]">
            <thead className="bg-slate-800 text-white dark:bg-slate-950 print:bg-slate-200 print:text-black">
              <tr>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-2 text-center w-10">
                  No
                </th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-left w-28">
                  Hari
                </th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-center w-36">
                  Jam Pelajaran (WIB)
                </th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-center w-24">
                  Kelas
                </th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-left">
                  Mata Pelajaran
                </th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-center w-32">
                  Keterangan
                </th>
                <th className="print:hidden border border-slate-300 dark:border-slate-700 px-3 py-2 text-center w-20">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJadwal.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic border border-slate-300 dark:border-slate-700"
                  >
                    Belum ada jadwal mengajar yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredJadwal.map((j, idx) => (
                  <tr
                    key={j.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent transition-colors"
                  >
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-2 text-center font-bold text-slate-500 dark:text-slate-400 print:text-black">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 font-black text-blue-600 dark:text-blue-400 print:text-black">
                      {j.hari}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 font-mono font-bold text-center">
                      {j.jam}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-center font-black">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-transparent border border-slate-200 dark:border-slate-700 print:border-none">
                        Kelas {j.kelas}
                      </span>
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 font-extrabold text-slate-800 dark:text-slate-100 print:text-black">
                      {j.mapel}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 text-center text-slate-500 print:text-black text-[11px]">
                      Tatap Muka
                    </td>
                    <td className="print:hidden border border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleStartEdit(j)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Jadwal"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteJadwal(j.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Section */}
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
              {config.Nama_Kepsek || "Nama Kepala Sekolah, M.Pd."}
            </p>
            <p className="text-[11px] print:text-[8px] text-slate-500 print:text-black">
              NIP. {config.NIP_Kepsek || "19800101 200501 1 001"}
            </p>
          </div>

          {/* Guru Mata Pelajaran */}
          <div className="text-right space-y-1">
            <p>
              {config.Tempat_Tanda_Tangan || "Kota"},{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}
            </p>
            <p className="font-semibold">Guru Pengampu Mata Pelajaran</p>

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
              {config.Nama_Guru || "Nama Guru Pengampu"}
            </p>
            <p className="text-[11px] print:text-[8px] text-slate-500 print:text-black">
              NIP. {config.NIP_Guru || "19900101 201501 1 002"}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Edit Jadwal */}
      {editingJadwal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Jadwal Mengajar</span>
              </h3>
              <button
                onClick={() => setEditingJadwal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hari *</label>
                <select
                  value={editHari}
                  onChange={(e) => setEditHari(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam (WIB) *</label>
                <input
                  type="text"
                  value={editJam}
                  onChange={(e) => setEditJam(e.target.value)}
                  placeholder="Contoh: 07:30 - 09:00"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelas *</label>
                <select
                  value={editKelas}
                  onChange={(e) => setEditKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  required
                >
                  <option value="">Pilih Kelas</option>
                  {kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mata Pelajaran *</label>
                <select
                  value={editMapel}
                  onChange={(e) => setEditMapel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  required
                >
                  <option value="">Pilih Mapel</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.namaMapel}>
                      {m.namaMapel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingJadwal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
