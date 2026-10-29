import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Save, 
  CheckCircle2, 
  Printer, 
  FileDown, 
  FileSpreadsheet, 
  Eye, 
  BookOpen, 
  Filter, 
  CalendarDays,
  Layers,
  Sparkles
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { JurnalAgenda, Mapel, Siswa, Pengaturan } from "../types";
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

const NAMA_BULAN = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" }
];

const HARI_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

interface AgendaMengajarViewProps {
  agendaList: JurnalAgenda[];
  mapelList: Mapel[];
  siswaList: Siswa[];
  config: Pengaturan;
}

export const AgendaMengajarView: React.FC<AgendaMengajarViewProps> = ({
  agendaList,
  mapelList,
  siswaList,
  config
}) => {
  // Mode View: 'kelola' (Input & Tabel) or 'cetak' (Pratinjau & Cetak Resmi)
  const [viewTab, setViewTab] = useState<"kelola" | "cetak">("kelola");

  // Form Input Agenda Baru
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [jam, setJam] = useState<string>("1 - 2");
  const [kelas, setKelas] = useState<string>("");
  const [mapel, setMapel] = useState<string>("");
  const [materi, setMateri] = useState<string>("");
  const [status, setStatus] = useState<string>("Terlaksana");
  const [absenSiswa, setAbsenSiswa] = useState<string>("Nihil");
  const [ket, setKet] = useState<string>("");

  // Edit Agenda State
  const [editingAgenda, setEditingAgenda] = useState<JurnalAgenda | null>(null);
  const [editTanggal, setEditTanggal] = useState("");
  const [editJam, setEditJam] = useState("");
  const [editKelas, setEditKelas] = useState("");
  const [editMapel, setEditMapel] = useState("");
  const [editMateri, setEditMateri] = useState("");
  const [editStatus, setEditStatus] = useState("Terlaksana");
  const [editAbsenSiswa, setEditAbsenSiswa] = useState("");
  const [editKet, setEditKet] = useState("");

  // FILTER CETAK JURNAL AGENDA
  const [printMode, setPrintMode] = useState<"bulanan" | "semester">("bulanan");
  const currentDate = new Date();
  const [selectedBulan, setSelectedBulan] = useState<string>(
    String(currentDate.getMonth() + 1).padStart(2, "0")
  );
  const [selectedTahun, setSelectedTahun] = useState<string>(
    String(currentDate.getFullYear())
  );
  const [selectedSemester, setSelectedSemester] = useState<"ganjil" | "genap" | "semua">("ganjil");
  const [filterKelas, setFilterKelas] = useState<string>("Semua");
  const [filterMapel, setFilterMapel] = useState<string>("Semua");
  const [filterStatus, setFilterStatus] = useState<string>("Semua");

  const kelasOptions = useMemo(() => {
    return Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();
  }, [siswaList]);

  // Filtered Agenda Items based on Printing and Selection criteria
  const filteredAgenda = useMemo(() => {
    return [...agendaList]
      .filter((a) => {
        if (!a.tanggal) return false;
        const [tYear, tMonth] = a.tanggal.split("-");

        // Filter Mode: Bulanan vs Semester
        if (printMode === "bulanan") {
          if (tYear !== selectedTahun || tMonth !== selectedBulan) return false;
        } else {
          // Per Semester: Ganjil (07-12), Genap (01-06)
          const mNum = parseInt(tMonth, 10);
          if (selectedSemester === "ganjil") {
            if (!(mNum >= 7 && mNum <= 12)) return false;
          } else if (selectedSemester === "genap") {
            if (!(mNum >= 1 && mNum <= 6)) return false;
          }
        }

        // Filter Kelas
        if (filterKelas !== "Semua" && a.kelas !== filterKelas) return false;

        // Filter Mapel
        if (filterMapel !== "Semua" && a.mapel !== filterMapel) return false;

        // Filter Status
        if (filterStatus !== "Semua" && a.status !== filterStatus) return false;

        return true;
      })
      .sort((a, b) => {
        const diff = a.tanggal.localeCompare(b.tanggal);
        if (diff !== 0) return diff;
        return (a.jam || "").localeCompare(b.jam || "");
      });
  }, [
    agendaList,
    printMode,
    selectedBulan,
    selectedTahun,
    selectedSemester,
    filterKelas,
    filterMapel,
    filterStatus
  ]);

  // Statistics for filtered agenda
  const agendaStats = useMemo(() => {
    const total = filteredAgenda.length;
    let terlaksana = 0;
    let tunda = 0;

    filteredAgenda.forEach((a) => {
      if (a.status === "Terlaksana") terlaksana++;
      else tunda++;
    });

    const percent = total > 0 ? Math.round((terlaksana / total) * 100) : 0;
    return { total, terlaksana, tunda, percent };
  }, [filteredAgenda]);

  const handleStartEdit = (a: JurnalAgenda) => {
    setEditingAgenda(a);
    setEditTanggal(a.tanggal);
    setEditJam(a.jam);
    setEditKelas(a.kelas);
    setEditMapel(a.mapel);
    setEditMateri(a.materi);
    setEditStatus(a.status || "Terlaksana");
    setEditAbsenSiswa(a.absenSiswa || "");
    setEditKet(a.ket || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda) return;

    if (!editTanggal || !editKelas || !editMapel || !editMateri.trim()) {
      notifyEditError("Silakan lengkapi Tanggal, Kelas, Mapel, dan Materi Pembelajaran.");
      return;
    }

    const updated: JurnalAgenda = {
      ...editingAgenda,
      tanggal: editTanggal,
      jam: editJam.trim(),
      kelas: editKelas,
      mapel: editMapel,
      materi: editMateri.trim(),
      status: editStatus,
      absenSiswa: editAbsenSiswa.trim(),
      ket: editKet.trim()
    };

    try {
      await saveDocument(COLLECTIONS.JURNAL_AGENDA, editingAgenda.id, updated);
      setEditingAgenda(null);
      notifyEditSuccess("Jurnal agenda berhasil diperbarui!");
    } catch (err: any) {
      notifyEditError(err.message || "Gagal memperbarui agenda.");
    }
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelas || !mapel || !materi.trim()) {
      notifySimpanError("Silakan pilih Kelas, Mapel, dan isi Materi Pembelajaran.");
      return;
    }

    const id = Date.now().toString();
    const newAgenda: JurnalAgenda = {
      id,
      tanggal,
      jam: jam.trim(),
      kelas,
      mapel,
      materi: materi.trim(),
      status,
      absenSiswa: absenSiswa.trim() || "Nihil",
      ket: ket.trim(),
      namaGuru: config.Nama_Guru || "Guru"
    };

    try {
      await saveDocument(COLLECTIONS.JURNAL_AGENDA, id, newAgenda);
      setMateri("");
      setKet("");
      setAbsenSiswa("Nihil");
      notifySimpanSuccess("Jurnal agenda mengajar tersimpan ke database!");
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan agenda.");
    }
  };

  const handleDeleteAgenda = async (id: string) => {
    const isConfirmed = await confirmDeleteAlert(
      "Hapus Jurnal Agenda?",
      "Apakah Anda yakin ingin menghapus data jurnal agenda mengajar ini?"
    );
    if (isConfirmed) {
      try {
        await deleteDocument(COLLECTIONS.JURNAL_AGENDA, id);
        notifyHapusSuccess("Jurnal agenda berhasil dihapus.");
      } catch (err: any) {
        notifyHapusError(err.message || "Gagal menghapus agenda.");
      }
    }
  };

  // 1. Browser Print (window.print)
  const handlePrint = () => {
    window.print();
  };

  // Helper title description
  const periodeLabel = useMemo(() => {
    if (printMode === "bulanan") {
      const bObj = NAMA_BULAN.find((b) => b.value === selectedBulan);
      return `BULAN ${bObj?.label?.toUpperCase() || ""} ${selectedTahun}`;
    } else {
      if (selectedSemester === "ganjil") {
        return "SEMESTER GANJIL (JULI - DESEMBER 2026)";
      } else if (selectedSemester === "genap") {
        return "SEMESTER GENAP (JANUARI - JUNI 2027)";
      }
      return "SEMESTER GANJIL & GENAP (TAHUN AJARAN 2026/2027)";
    }
  }, [printMode, selectedBulan, selectedTahun, selectedSemester]);

  // 2. Export PDF via jsPDF & autoTable
  const handleExportPDF = () => {
    if (filteredAgenda.length === 0) {
      notifyCetakError("Tidak ada data jurnal agenda pada filter periode ini.");
      return;
    }

    try {
      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      const pemerintah = (config.Pemerintah || "PEMERINTAH PROVINSI / KABUPATEN").toUpperCase();
      const sekolah = (config.Nama_Sekolah || "SMP NEGERI 3 KERINCI").toUpperCase();
      const alamat = config.Alamat_Sekolah || "Jalan Pendidikan No. 1";

      // Official Kop Surat (Without DINAS PENDIDIKAN DAN KEBUDAYAAN)
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

      // Title & Document Info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`JURNAL AGENDA MENGAJAR GURU - ${periodeLabel}`, centerX, 38, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Guru Pengampu : ${config.Nama_Guru || "Guru"}`, 12, 45);
      doc.text(`NIP Guru            : ${config.NIP_Guru || "-"}`, 12, 50);

      const rightInfoX = pageWidth - 80;
      doc.text(`Kelas / Mapel : ${filterKelas !== "Semua" ? `Kelas ${filterKelas}` : "Semua Kelas"} | ${filterMapel !== "Semua" ? filterMapel : "Semua Mapel"}`, rightInfoX, 45);
      doc.text(`Keterlaksanaan : ${agendaStats.terlaksana} / ${agendaStats.total} KBM (${agendaStats.percent}%)`, rightInfoX, 50);

      // Table Body
      const tableBody = filteredAgenda.map((a, idx) => {
        let hariStr = "";
        try {
          const d = new Date(a.tanggal);
          hariStr = HARI_NAMES[d.getDay()] || "";
        } catch (e) {}

        return [
          idx + 1,
          hariStr ? `${hariStr},\n${a.tanggal}` : a.tanggal,
          a.jam,
          `Kelas ${a.kelas}`,
          a.mapel,
          a.materi,
          a.status,
          a.absenSiswa || "Nihil",
          a.ket || "-"
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [
          [
            "No",
            "Hari / Tanggal",
            "Jam Ke",
            "Kelas",
            "Mata Pelajaran",
            "Materi Pokok Pembelajaran",
            "Status",
            "Siswa Absen",
            "Catatan / Keterangan"
          ]
        ],
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          cellPadding: 2
        },
        styles: { fontSize: 7, cellPadding: 1.8 },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 28, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 18, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 20, halign: "center", fontStyle: "bold" },
          4: { cellWidth: 32, fontStyle: "bold" },
          5: { cellWidth: 75 },
          6: { cellWidth: 22, halign: "center", fontStyle: "bold" },
          7: { cellWidth: 28, halign: "center" },
          8: { cellWidth: "auto" }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 120;

      // Signatures
      let sigY = finalY + 12;
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

      // Right Signature (Guru Pengampu)
      const sigRightX = pageWidth - 65;
      doc.text(`${tempat}, ${dateStr}`, sigRightX, sigY, { align: "center" });
      doc.text("Guru Mata Pelajaran", sigRightX, sigY + 4, { align: "center" });

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

      const safeMode = printMode === "bulanan" ? `Bulan_${selectedBulan}_${selectedTahun}` : `Semester_${selectedSemester}`;
      doc.save(`Jurnal_Agenda_Mengajar_${safeMode}.pdf`);
      notifyCetakSuccess("Dokumen Jurnal Agenda Mengajar resmi berhasil diunduh ke PDF!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Jurnal Agenda PDF.");
    }
  };

  // 3. Export CSV
  const handleExportCSV = () => {
    if (filteredAgenda.length === 0) {
      notifyCetakError("Tidak ada data agenda untuk diekspor.");
      return;
    }

    try {
      let csv = "\uFEFF"; // UTF-8 BOM
      csv += `JURNAL AGENDA MENGAJAR GURU - ${periodeLabel}\n`;
      csv += `Sekolah,${config.Nama_Sekolah || "SMP NEGERI 3 KERINCI"}\n`;
      csv += `Guru Pengampu,${config.Nama_Guru || "Guru"}\n`;
      csv += `NIP,${config.NIP_Guru || "-"}\n\n`;

      csv += `No,Tanggal,Jam Ke,Kelas,Mata Pelajaran,Materi Pembelajaran,Status,Siswa Absen,Keterangan\n`;

      filteredAgenda.forEach((a, idx) => {
        const row = [
          idx + 1,
          `"${a.tanggal}"`,
          `"${a.jam}"`,
          `"${a.kelas}"`,
          `"${a.mapel}"`,
          `"${(a.materi || "").replace(/"/g, '""')}"`,
          `"${a.status}"`,
          `"${(a.absenSiswa || "Nihil").replace(/"/g, '""')}"`,
          `"${(a.ket || "").replace(/"/g, '""')}"`
        ];
        csv += row.join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeMode = printMode === "bulanan" ? `Bulan_${selectedBulan}_${selectedTahun}` : `Semester_${selectedSemester}`;
      link.setAttribute("download", `Jurnal_Agenda_Mengajar_${safeMode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifyCetakSuccess("File rekap Jurnal Agenda (CSV/Excel) berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mengunduh file CSV.");
    }
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR & TAB SWITCHER (Hidden in print) */}
      <div className="print:hidden space-y-4">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <span>Jurnal Agenda Mengajar Harian Guru</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Catat kegiatan KBM harian, jam pelajaran, keterlaksanaan materi, ketidakhadiran siswa, dan cetak format buku jurnal resmi per bulan maupun per semester.
            </p>
          </div>

          {/* Tab Selector & Print Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewTab("kelola")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewTab === "kelola"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Input & Kelola</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab("cetak")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewTab === "cetak"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Jurnal Resmi</span>
              </button>
            </div>

            {viewTab === "cetak" && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Print Preview)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel / CSV</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* PRINT CONTROLS FILTER BAR (Visible when in Cetak Tab) */}
        {viewTab === "cetak" && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mode Periode Cetak:
                </span>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintMode("bulanan")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      printMode === "bulanan"
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    Per Bulan (Kalender)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode("semester")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      printMode === "semester"
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    Per Semester (Ganjil / Genap)
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  Total: {agendaStats.total} KBM
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  Terlaksana: {agendaStats.terlaksana} ({agendaStats.percent}%)
                </span>
                {agendaStats.tunda > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                    Tunda: {agendaStats.tunda}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Selector Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {printMode === "bulanan" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Pilih Bulan:
                    </label>
                    <select
                      value={selectedBulan}
                      onChange={(e) => setSelectedBulan(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
                    >
                      {NAMA_BULAN.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Pilih Tahun:
                    </label>
                    <select
                      value={selectedTahun}
                      onChange={(e) => setSelectedTahun(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
                    >
                      <option value="2026">Tahun 2026</option>
                      <option value="2027">Tahun 2027</option>
                      <option value="2025">Tahun 2025</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Pilih Semester (TA 2026/2027):
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ganjil">Semester Ganjil (Juli - Desember 2026)</option>
                    <option value="genap">Semester Genap (Januari - Juni 2027)</option>
                    <option value="semua">Semua Semester (1 Tahun Penuh)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter Kelas:
                </label>
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Kelas</option>
                  {kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter Mapel:
                </label>
                <select
                  value={filterMapel}
                  onChange={(e) => setFilterMapel(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Mapel</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.namaMapel}>
                      {m.namaMapel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Status KBM:
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Terlaksana">Terlaksana</option>
                  <option value="Tunda">Tunda</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIEW TAB 1: KELOLA & INPUT AGENDA */}
      {viewTab === "kelola" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Input Jurnal Agenda KBM Hari Ini</span>
            </h3>
            <button
              onClick={() => setViewTab("cetak")}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Bulanan / Semester &rarr;</span>
            </button>
          </div>

          <form
            onSubmit={handleAddAgenda}
            className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal *</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam Ke *</label>
              <input
                type="text"
                placeholder="Contoh: 1 - 2"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelas *</label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
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
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
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

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Materi Pembelajaran *</label>
              <input
                type="text"
                placeholder="Detail materi atau modul yang diajarkan"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status Keterlaksanaan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Terlaksana">Terlaksana</option>
                <option value="Tunda">Tunda</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Absen Siswa</label>
              <input
                type="text"
                placeholder="Nihil / Nama siswa"
                value={absenSiswa}
                onChange={(e) => setAbsenSiswa(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Keterangan / Catatan Tambahan</label>
              <input
                type="text"
                placeholder="Opsional (misal: diskusi kelompok lancar)"
                value={ket}
                onChange={(e) => setKet(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Jurnal</span>
              </button>
            </div>
          </form>

          {/* Table Inline Agenda Management */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3 text-center">Jam</th>
                  <th className="p-3 text-center">Kelas & Mapel</th>
                  <th className="p-3">Materi Pembelajaran</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Absen Siswa</th>
                  <th className="p-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {agendaList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Belum ada data jurnal agenda mengajar. Silakan tambahkan melalui form di atas.
                    </td>
                  </tr>
                ) : (
                  agendaList.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 font-semibold whitespace-nowrap">{a.tanggal}</td>
                      <td className="p-3 text-center font-mono font-bold">{a.jam}</td>
                      <td className="p-3 text-center font-bold">
                        <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-md">
                          {a.kelas} - {a.mapel}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{a.materi}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            a.status === "Terlaksana"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {a.status || "Terlaksana"}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-medium">{a.absenSiswa || "Nihil"}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleStartEdit(a)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgenda(a.id)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
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
        </div>
      )}

      {/* VIEW TAB 2: PRINTABLE OFFICIAL SHEET / PRATINJAU CETAK RESMI (Bulanan & Per Semester) */}
      {viewTab === "cetak" && (
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

          {/* Document Title & Teacher Information */}
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black">
              JURNAL AGENDA MENGAJAR GURU
            </h2>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase text-blue-700 dark:text-blue-400 print:text-black">
              {periodeLabel}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-black">
              Tahun Ajaran 2026/2027
            </p>
          </div>

          {/* Metadata Box */}
          <div className="grid grid-cols-2 gap-4 text-xs print:text-[9px] mb-4 p-3 bg-slate-50 dark:bg-slate-900/60 print:bg-transparent rounded-xl border border-slate-200 dark:border-slate-700 print:border-none">
            <div className="space-y-1">
              <p>
                <span className="font-bold text-slate-500 print:text-black">Nama Guru :</span>{" "}
                <span className="font-bold">{config.Nama_Guru || "Drs. Yefri Haryanto, M.Pd."}</span>
              </p>
              <p>
                <span className="font-bold text-slate-500 print:text-black">NIP Guru   :</span>{" "}
                <span>{config.NIP_Guru || "19850312 201001 1 008"}</span>
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p>
                <span className="font-bold text-slate-500 print:text-black">Kelas / Mapel :</span>{" "}
                <span className="font-bold">
                  {filterKelas !== "Semua" ? `Kelas ${filterKelas}` : "Semua Kelas"} -{" "}
                  {filterMapel !== "Semua" ? filterMapel : "Semua Mapel"}
                </span>
              </p>
              <p>
                <span className="font-bold text-slate-500 print:text-black">Keterlaksanaan :</span>{" "}
                <span className="font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                  {agendaStats.terlaksana} / {agendaStats.total} Pertemuan ({agendaStats.percent}%)
                </span>
              </p>
            </div>
          </div>

          {/* Official Table for Print */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 print:border-black text-xs print:text-[9px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 print:bg-slate-100 text-slate-800 dark:text-slate-200 print:text-black font-black uppercase text-[10px] print:text-[8px]">
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-10">
                    No
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-center w-28">
                    Hari / Tanggal
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-20">
                    Jam Ke
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-20">
                    Kelas
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left w-36">
                    Mata Pelajaran
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                    Materi Pokok / Modul Pembelajaran
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-24">
                    Status
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center w-28">
                    Siswa Absen
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAgenda.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="border border-slate-300 dark:border-slate-700 print:border-black p-8 text-center text-slate-400 italic"
                    >
                      Tidak ada data jurnal agenda mengajar untuk periode {periodeLabel}.
                    </td>
                  </tr>
                ) : (
                  filteredAgenda.map((a, idx) => {
                    let hariStr = "";
                    try {
                      const d = new Date(a.tanggal);
                      hariStr = HARI_NAMES[d.getDay()] || "";
                    } catch (e) {}

                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent"
                      >
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold text-slate-500 print:text-black">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                          {hariStr ? `${hariStr}, ` : ""}{a.tanggal}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-mono font-bold">
                          {a.jam}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold">
                          Kelas {a.kelas}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 font-bold">
                          {a.mapel}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100 print:text-black">
                          {a.materi}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              a.status === "Terlaksana"
                                ? "text-emerald-700 bg-emerald-50 print:bg-transparent print:text-black"
                                : "text-amber-700 bg-amber-50 print:bg-transparent print:text-black"
                            }`}
                          >
                            {a.status || "Terlaksana"}
                          </span>
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-slate-600 dark:text-slate-400 print:text-black">
                          {a.absenSiswa || "Nihil"}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-slate-600 dark:text-slate-400 print:text-black">
                          {a.ket || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures & Stamp */}
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

            {/* Guru Mata Pelajaran */}
            <div className="text-right space-y-1">
              <p>
                {config.Tempat_Tanda_Tangan || "Kerinci"},{" "}
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
                {config.Nama_Guru || "Drs. Yefri Haryanto, M.Pd."}
              </p>
              <p className="text-[11px] print:text-[8px] text-slate-500 print:text-black">
                NIP. {config.NIP_Guru || "19850312 201001 1 008"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Agenda */}
      {editingAgenda && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Jurnal Agenda Mengajar</span>
              </h3>
              <button
                onClick={() => setEditingAgenda(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam Ke *</label>
                <input
                  type="text"
                  value={editJam}
                  onChange={(e) => setEditJam(e.target.value)}
                  placeholder="Contoh: 1 - 2"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
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

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Materi Pembelajaran *</label>
                <input
                  type="text"
                  value={editMateri}
                  onChange={(e) => setEditMateri(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status Keterlaksanaan</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="Terlaksana">Terlaksana</option>
                  <option value="Tunda">Tunda</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Absen Siswa</label>
                <input
                  type="text"
                  value={editAbsenSiswa}
                  onChange={(e) => setEditAbsenSiswa(e.target.value)}
                  placeholder="Nihil / Nama siswa"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={editKet}
                  onChange={(e) => setEditKet(e.target.value)}
                  placeholder="Catatan tambahan"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingAgenda(null)}
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
