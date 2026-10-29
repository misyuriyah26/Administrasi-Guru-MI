import React, { useState, useMemo, useRef } from "react";
import {
  CalendarDays,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Siswa, Mapel, LogAbsensi, Pengaturan } from "../types";
import { notifyCetakSuccess, notifyCetakError } from "../lib/swal";

interface CetakAbsenBulananViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  absensiList: LogAbsensi[];
  config: Pengaturan;
  onNavigate?: (tab: string) => void;
}

const BULAN_OPTIONS = [
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
  { value: "12", label: "Desember" },
];

const NAMA_HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const CetakAbsenBulananView: React.FC<CetakAbsenBulananViewProps> = ({
  siswaList,
  mapelList,
  absensiList,
  config,
  onNavigate,
}) => {
  const currentDate = new Date();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
  const currentYearStr = String(currentDate.getFullYear());

  // Filter States
  const [selectedTahun, setSelectedTahun] = useState<string>(currentYearStr);
  const [selectedBulan, setSelectedBulan] = useState<string>(currentMonthStr);
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedMapel, setSelectedMapel] = useState<string>("Semua Mapel");
  const [showWeekend, setShowWeekend] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Available classes
  const kelasOptions = useMemo(() => {
    return Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();
  }, [siswaList]);

  // Set default class if not set
  React.useEffect(() => {
    if (!selectedKelas && kelasOptions.length > 0) {
      setSelectedKelas(kelasOptions[0]);
    }
  }, [kelasOptions, selectedKelas]);

  // Number of days in the selected month & year
  const daysInMonth = useMemo(() => {
    const y = parseInt(selectedTahun, 10) || 2026;
    const m = parseInt(selectedBulan, 10) || 10;
    return new Date(y, m, 0).getDate();
  }, [selectedTahun, selectedBulan]);

  // Generate list of days info
  const daysList = useMemo(() => {
    const list: Array<{
      dayNumber: number;
      dayName: string;
      dateStr: string;
      isSunday: boolean;
      isSaturday: boolean;
      isWeekend: boolean;
    }> = [];
    const y = parseInt(selectedTahun, 10) || 2026;
    const m = parseInt(selectedBulan, 10) || 10;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(y, m - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      const isWeekend = isSunday || isSaturday;
      const dateStr = `${selectedTahun}-${selectedBulan}-${String(day).padStart(2, "0")}`;

      if (!showWeekend && isWeekend) {
        continue;
      }

      list.push({
        dayNumber: day,
        dayName: NAMA_HARI_SINGKAT[dayOfWeek],
        dateStr,
        isSunday,
        isSaturday,
        isWeekend,
      });
    }
    return list;
  }, [daysInMonth, selectedTahun, selectedBulan, showWeekend]);

  // Filter students by selected class & search
  const filteredStudents = useMemo(() => {
    return siswaList
      .filter((s) => s.kelas === selectedKelas)
      .filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.nama.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, selectedKelas, searchQuery]);

  // Filter absensi for the month, year, and class
  const filteredAbsensi = useMemo(() => {
    return absensiList.filter((a) => {
      // Check class
      if (a.kelas !== selectedKelas) return false;

      // Check mapel
      if (selectedMapel && selectedMapel !== "Semua Mapel" && a.mapel !== selectedMapel) {
        return false;
      }

      // Check date / month & year
      const dateVal = a.waktu || a.tanggal;
      if (!dateVal) return false;

      const [thn, bln] = dateVal.split("-");
      if (thn !== selectedTahun || bln !== selectedBulan) {
        return false;
      }

      return true;
    });
  }, [absensiList, selectedKelas, selectedMapel, selectedTahun, selectedBulan]);

  // Lookup map: `${idSiswa}_${dateStr}` -> status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, "Hadir" | "Izin" | "Sakit" | "Alpa">();
    filteredAbsensi.forEach((record) => {
      const dateVal = record.waktu || record.tanggal;
      const studentKey1 = `${record.idSiswa}_${dateVal}`;
      const studentKey2 = `${record.namaSiswa}_${dateVal}`;
      map.set(studentKey1, record.status);
      map.set(studentKey2, record.status);
    });
    return map;
  }, [filteredAbsensi]);

  // Calculate stats for each student
  const studentStats = useMemo(() => {
    return filteredStudents.map((s) => {
      let h = 0, i = 0, sa = 0, a = 0;
      const dailyStatuses: Record<number, string> = {};

      daysList.forEach((dayInfo) => {
        const keyById = `${s.id}_${dayInfo.dateStr}`;
        const keyByNisn = `${s.nisn}_${dayInfo.dateStr}`;
        const keyByNama = `${s.nama}_${dayInfo.dateStr}`;

        const status =
          attendanceMap.get(keyById) ||
          attendanceMap.get(keyByNisn) ||
          attendanceMap.get(keyByNama);

        if (status) {
          dailyStatuses[dayInfo.dayNumber] = status;
          if (status === "Hadir") h++;
          else if (status === "Izin") i++;
          else if (status === "Sakit") sa++;
          else if (status === "Alpa") a++;
        } else {
          dailyStatuses[dayInfo.dayNumber] = "-";
        }
      });

      const totalRecorded = h + i + sa + a;
      const percentage = totalRecorded > 0 ? Math.round((h / totalRecorded) * 100) : 0;

      return {
        siswa: s,
        dailyStatuses,
        h,
        i,
        sa,
        a,
        totalRecorded,
        percentage,
      };
    });
  }, [filteredStudents, daysList, attendanceMap]);

  // Aggregated class totals
  const classSummary = useMemo(() => {
    let grandH = 0, grandI = 0, grandS = 0, grandA = 0;
    studentStats.forEach((st) => {
      grandH += st.h;
      grandI += st.i;
      grandS += st.sa;
      grandA += st.a;
    });

    const totalAll = grandH + grandI + grandS + grandA;
    const avgPercentage =
      studentStats.length > 0
        ? Math.round(
            studentStats.reduce((acc, curr) => acc + curr.percentage, 0) /
              studentStats.length
          )
        : 0;

    return {
      grandH,
      grandI,
      grandS,
      grandA,
      totalAll,
      avgPercentage,
      studentCount: filteredStudents.length,
    };
  }, [studentStats, filteredStudents.length]);

  // Active Month Label
  const namaBulanTerpilih =
    BULAN_OPTIONS.find((b) => b.value === selectedBulan)?.label || "Bulan";

  // Quick navigation helper
  const handlePrevMonth = () => {
    const curIdx = BULAN_OPTIONS.findIndex((b) => b.value === selectedBulan);
    if (curIdx > 0) {
      setSelectedBulan(BULAN_OPTIONS[curIdx - 1].value);
    } else {
      setSelectedBulan("12");
      setSelectedTahun(String(parseInt(selectedTahun, 10) - 1));
    }
  };

  const handleNextMonth = () => {
    const curIdx = BULAN_OPTIONS.findIndex((b) => b.value === selectedBulan);
    if (curIdx < BULAN_OPTIONS.length - 1) {
      setSelectedBulan(BULAN_OPTIONS[curIdx + 1].value);
    } else {
      setSelectedBulan("01");
      setSelectedTahun(String(parseInt(selectedTahun, 10) + 1));
    }
  };

  // 1. Direct Print Function
  const handlePrint = () => {
    window.print();
  };

  // 2. Export PDF via jsPDF & autoTable
  const handleExportPDF = () => {
    if (!selectedKelas) {
      notifyCetakError("Silakan pilih kelas terlebih dahulu.");
      return;
    }

    try {
      // Landscape A4 orientation
      const doc = new jsPDF("l", "mm", "a4");
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
      doc.setFontSize(11);
      doc.text(
        `REKAPITULASI PRESENSI / ABSENSI SISWA BULANAN - KELAS ${selectedKelas.toUpperCase()}`,
        centerX,
        39,
        { align: "center" }
      );

      // Meta Info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `Bulan: ${namaBulanTerpilih} ${selectedTahun}   |   Mata Pelajaran: ${selectedMapel}   |   Semester: Ganjil / Genap 2026/2027`,
        centerX,
        44,
        { align: "center" }
      );

      // Table Headers: No, NISN, Nama, [1..days], H, S, I, A, %
      const headDays = daysList.map((d) => String(d.dayNumber));
      const headRow = ["No", "NISN", "Nama Siswa", ...headDays, "H", "S", "I", "A", "%"];

      const bodyRows = studentStats.map((st, idx) => {
        const dayCols = daysList.map((d) => {
          const s = st.dailyStatuses[d.dayNumber];
          if (!s || s === "-") return "";
          return s[0]; // H, I, S, A
        });

        return [
          idx + 1,
          st.siswa.nisn || "-",
          st.siswa.nama,
          ...dayCols,
          st.h,
          st.sa,
          st.i,
          st.a,
          `${st.percentage}%`,
        ];
      });

      // Bottom Summary Row
      const daySummaryCols = daysList.map((d) => {
        let countH = 0;
        studentStats.forEach((st) => {
          if (st.dailyStatuses[d.dayNumber] === "Hadir") countH++;
        });
        return countH > 0 ? String(countH) : "";
      });

      bodyRows.push([
        "",
        "",
        "JUMLAH HADIR KELAS",
        ...daySummaryCols,
        classSummary.grandH,
        classSummary.grandS,
        classSummary.grandI,
        classSummary.grandA,
        `${classSummary.avgPercentage}%`,
      ]);

      // Set cell widths dynamically
      const dayColWidth = Math.max(3.5, Math.min(5.5, (pageWidth - 85) / daysList.length));

      const columnStyles: Record<number, any> = {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 42 },
      };

      daysList.forEach((_, i) => {
        columnStyles[3 + i] = { cellWidth: dayColWidth, halign: "center", fontSize: 6.5 };
      });

      const totalColsStart = 3 + daysList.length;
      columnStyles[totalColsStart] = { cellWidth: 7, halign: "center", fontStyle: "bold" };
      columnStyles[totalColsStart + 1] = { cellWidth: 7, halign: "center" };
      columnStyles[totalColsStart + 2] = { cellWidth: 7, halign: "center" };
      columnStyles[totalColsStart + 3] = { cellWidth: 7, halign: "center" };
      columnStyles[totalColsStart + 4] = { cellWidth: 10, halign: "center", fontStyle: "bold" };

      autoTable(doc, {
        startY: 48,
        head: [headRow],
        body: bodyRows,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 6.5,
          halign: "center",
          cellPadding: 1,
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles,
        didParseCell: (data) => {
          // Highlight summary row
          if (data.row.index === bodyRows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [241, 245, 249];
          }
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 130;
      const pageHeight = doc.internal.pageSize.getHeight();

      // Legend note
      let noteY = finalY + 5;
      if (noteY > pageHeight - 35) {
        doc.addPage();
        noteY = 15;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Keterangan Status: H = Hadir, S = Sakit, I = Izin, A = Alpa (Tanpa Keterangan)", 12, noteY);

      // Signatures
      let sigY = noteY + 8;
      if (sigY > pageHeight - 30) {
        doc.addPage();
        sigY = 15;
      }

      const kepsek = config.Nama_Kepsek || "Nama Kepala Sekolah, M.Pd.";
      const nipKepsek = config.NIP_Kepsek || "19800101 200501 1 001";
      const namaGuru = config.Nama_Guru || "Nama Guru Pengampu";
      const nipGuru = config.NIP_Guru || "19900101 201501 1 002";
      const tempat = config.Tempat_Tanda_Tangan || "Kota";

      const dateStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

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

      // Right Signature (Guru Pengampu / Wali)
      const rightX = pageWidth - 65;
      doc.text(`${tempat}, ${dateStr}`, rightX, sigY, { align: "center" });
      doc.text("Guru Mata Pelajaran / Wali Kelas", rightX, sigY + 4, { align: "center" });

      if (config.TandaTangan_Guru && config.Tampilkan_TTD_Guru !== false) {
        try {
          doc.addImage(config.TandaTangan_Guru, "PNG", rightX - 16, sigY + 5, 32, 16);
        } catch (e) {
          console.warn("Could not add TandaTangan_Guru to PDF:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text(namaGuru, rightX, sigY + 23, { align: "center" });
      doc.setFont("helvetica", "normal");
      if (nipGuru) doc.text("NIP. " + nipGuru, rightX, sigY + 27, { align: "center" });

      doc.save(`Rekap_Absensi_Bulanan_${selectedKelas}_${selectedBulan}_${selectedTahun}.pdf`);
      notifyCetakSuccess(
        `Laporan Rekap Absensi Bulanan Kelas ${selectedKelas} (${namaBulanTerpilih} ${selectedTahun}) berhasil diunduh!`
      );
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Rekap Absensi PDF.");
    }
  };

  // 3. Export Excel / CSV
  const handleExportCSV = () => {
    if (!selectedKelas) {
      notifyCetakError("Pilih kelas terlebih dahulu.");
      return;
    }

    try {
      const dayHeaders = daysList.map((d) => `Tgl ${d.dayNumber}`).join(",");
      let csv = `\uFEFF`; // UTF-8 BOM
      csv += `REKAPITULASI PRESENSI SISWA BULANAN\n`;
      csv += `Sekolah,${config.Nama_Sekolah || "Sekolah"}\n`;
      csv += `Kelas,${selectedKelas}\n`;
      csv += `Bulan / Tahun,${namaBulanTerpilih} ${selectedTahun}\n`;
      csv += `Mata Pelajaran,${selectedMapel}\n\n`;

      csv += `No,NISN,Nama Siswa,${dayHeaders},Total Hadir,Total Sakit,Total Izin,Total Alpa,Persentase\n`;

      studentStats.forEach((st, idx) => {
        const dayVals = daysList.map((d) => {
          const s = st.dailyStatuses[d.dayNumber];
          return s === "-" ? "" : s;
        });

        const row = [
          idx + 1,
          `"${st.siswa.nisn || ""}"`,
          `"${st.siswa.nama.replace(/"/g, '""')}"`,
          ...dayVals,
          st.h,
          st.sa,
          st.i,
          st.a,
          `"${st.percentage}%"`,
        ];
        csv += row.join(",") + "\n";
      });

      // Total Class row
      const classDaySums = daysList.map((d) => {
        let countH = 0;
        studentStats.forEach((st) => {
          if (st.dailyStatuses[d.dayNumber] === "Hadir") countH++;
        });
        return countH;
      });

      csv += `,"",TOTAL HADIR KELAS,${classDaySums.join(",")},${classSummary.grandH},${classSummary.grandS},${classSummary.grandI},${classSummary.grandA},"${classSummary.avgPercentage}%"\n`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Rekap_Absensi_Bulanan_${selectedKelas}_${selectedBulan}_${selectedTahun}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifyCetakSuccess("File Rekap Absensi Bulanan (CSV/Excel) berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mengunduh file CSV.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Non-Printable Header & Action Bar */}
      <div className="print:hidden space-y-4">
        {/* Title banner */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                <CalendarDays className="w-5 h-5" />
              </span>
              <span>Cetak Rekap Absensi Siswa Perbulan</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Format buku presensi bulanan matriks tanggal 1 sampai 31 dengan perhitungan otomatis
              Hadir (H), Sakit (S), Izin (I), Alpa (A), persentase kehadiran, lengkap Kop Surat Resmi dan Tanda Tangan.
            </p>
          </div>

          {/* Action Buttons */}
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
              <Download className="w-4 h-4" />
              <span>Download PDF A4</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Bulan Selector with quick arrows */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Bulan
              </label>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {BULAN_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleNextMonth}
                  className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  title="Bulan Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tahun Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Tahun
              </label>
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* Kelas Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Kelas
              </label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {kelasOptions.length === 0 ? (
                  <option value="">Belum ada kelas</option>
                ) : (
                  kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Mapel Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Semua Mapel">Semua Mapel (Presensi Harian Wali)</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.namaMapel}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Student */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Cari Nama / NISN
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-medium border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Toggle Options and Quick Jump */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeekend}
                  onChange={(e) => setShowWeekend(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">Tampilkan Kolom Hari Sabtu & Minggu</span>
              </label>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              {onNavigate && (
                <button
                  onClick={() => onNavigate("absensi")}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Input / Scan Presensi Hari Ini</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Summary Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Siswa Terdaftar</p>
            <p className="text-xl font-black text-slate-800 dark:text-white mt-1">
              {classSummary.studentCount}{" "}
              <span className="text-xs font-semibold text-slate-400">Anak</span>
            </p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              Rata-rata Kehadiran
            </p>
            <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
              {classSummary.avgPercentage}%
            </p>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Hadir (H)
            </p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {classSummary.grandH}
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 shadow-xs">
            <p className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase">
              Total Sakit (S)
            </p>
            <p className="text-xl font-black text-sky-800 dark:text-sky-300 mt-1">
              {classSummary.grandS}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-xs">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
              Total Izin (I)
            </p>
            <p className="text-xl font-black text-amber-800 dark:text-amber-300 mt-1">
              {classSummary.grandI}
            </p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 shadow-xs">
            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              Total Alpa (A)
            </p>
            <p className="text-xl font-black text-rose-800 dark:text-rose-300 mt-1">
              {classSummary.grandA}
            </p>
          </div>
        </div>
      </div>

      {/* PRINTABLE AREA: Document Sheet Layout */}
      <div
        ref={printAreaRef}
        id="print-sheet-absen-bulanan"
        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white print:text-black print:bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-0 transition-colors"
      >
        {/* Official Letterhead / Kop Surat (Always visible on print) */}
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

        {/* Document Title & Metadata */}
        <div className="text-center mb-5">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black">
            REKAPITULASI PRESENSI / ABSENSI SISWA BULANAN
          </h2>
          <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-bold text-slate-700 dark:text-slate-300 print:text-black bg-slate-50 dark:bg-slate-800/60 print:bg-transparent py-1.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 print:border-none">
            <span>
              <span className="text-slate-500 font-normal">Kelas:</span> Kelas {selectedKelas || "-"}
            </span>
            <span>
              <span className="text-slate-500 font-normal">Bulan/Tahun:</span> {namaBulanTerpilih} {selectedTahun}
            </span>
            <span>
              <span className="text-slate-500 font-normal">Mata Pelajaran:</span> {selectedMapel}
            </span>
            <span>
              <span className="text-slate-500 font-normal">Tahun Ajaran:</span> 2026/2027
            </span>
          </div>
        </div>

        {/* Attendance Matrix Table */}
        <div className="overflow-x-auto custom-scrollbar border border-slate-300 dark:border-slate-700 print:border-black rounded-xl">
          <table className="w-full border-collapse text-[11px] print:text-[8px]">
            <thead>
              {/* Row 1: Header Titles */}
              <tr className="bg-slate-800 text-white dark:bg-slate-950 print:bg-slate-200 print:text-black">
                <th
                  rowSpan={2}
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1 text-center w-8"
                >
                  No
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-left w-24"
                >
                  NISN
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 text-left min-w-[140px]"
                >
                  Nama Siswa
                </th>
                <th
                  colSpan={daysList.length}
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-0.5 text-center"
                >
                  Tanggal ({namaBulanTerpilih} {selectedTahun})
                </th>
                <th
                  colSpan={5}
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-0.5 text-center bg-blue-900 text-white print:bg-slate-300 print:text-black"
                >
                  Rekapitulasi
                </th>
              </tr>

              {/* Row 2: Day Numbers and Total Column Headers */}
              <tr className="bg-slate-700 text-white dark:bg-slate-900 print:bg-slate-100 print:text-black font-mono">
                {daysList.map((d) => (
                  <th
                    key={d.dayNumber}
                    className={`border border-slate-300 dark:border-slate-700 print:border-black px-0.5 py-1 text-center min-w-[20px] ${
                      d.isSunday
                        ? "bg-rose-900/60 text-rose-200 print:bg-rose-100 print:text-rose-900"
                        : d.isSaturday
                        ? "bg-amber-900/50 text-amber-200 print:bg-amber-100 print:text-amber-900"
                        : ""
                    }`}
                    title={`${d.dayName}, ${d.dayNumber} ${namaBulanTerpilih}`}
                  >
                    <div className="text-[9px] print:text-[6px] font-normal opacity-80 leading-none">
                      {d.dayName}
                    </div>
                    <div className="font-bold">{d.dayNumber}</div>
                  </th>
                ))}
                <th
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center w-7 text-emerald-300 print:text-emerald-900 bg-slate-800 print:bg-transparent"
                  title="Hadir"
                >
                  H
                </th>
                <th
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center w-7 text-sky-300 print:text-sky-900 bg-slate-800 print:bg-transparent"
                  title="Sakit"
                >
                  S
                </th>
                <th
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center w-7 text-amber-300 print:text-amber-900 bg-slate-800 print:bg-transparent"
                  title="Izin"
                >
                  I
                </th>
                <th
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center w-7 text-rose-300 print:text-rose-900 bg-slate-800 print:bg-transparent"
                  title="Alpa"
                >
                  A
                </th>
                <th
                  className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center w-10 text-white print:text-black bg-blue-950 print:bg-transparent font-bold"
                  title="Persentase Kehadiran"
                >
                  %
                </th>
              </tr>
            </thead>

            <tbody>
              {studentStats.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysList.length + 8}
                    className="p-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic border border-slate-300 dark:border-slate-700"
                  >
                    Belum ada data siswa di Kelas {selectedKelas || "-"}
                  </td>
                </tr>
              ) : (
                studentStats.map((st, idx) => (
                  <tr
                    key={st.siswa.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent transition-colors"
                  >
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1 text-center font-bold text-slate-500 dark:text-slate-400 print:text-black">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 font-mono text-[10px] print:text-[7px]">
                      {st.siswa.nisn || "-"}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1 font-bold truncate max-w-[160px]">
                      {st.siswa.nama}
                    </td>

                    {/* Day status marks */}
                    {daysList.map((d) => {
                      const stat = st.dailyStatuses[d.dayNumber];
                      let badge = "";
                      let cellBg = "";

                      if (stat === "Hadir") {
                        badge = "H";
                        cellBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-black";
                      } else if (stat === "Sakit") {
                        badge = "S";
                        cellBg = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-black";
                      } else if (stat === "Izin") {
                        badge = "I";
                        cellBg = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-black";
                      } else if (stat === "Alpa") {
                        badge = "A";
                        cellBg = "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-black";
                      } else if (d.isSunday) {
                        cellBg = "bg-slate-100/60 dark:bg-slate-800/40 print:bg-slate-50";
                      } else if (d.isSaturday) {
                        cellBg = "bg-slate-50/50 dark:bg-slate-800/20";
                      }

                      return (
                        <td
                          key={d.dayNumber}
                          className={`border border-slate-300 dark:border-slate-700 print:border-black px-0.5 py-1 text-center font-mono ${cellBg}`}
                        >
                          {badge || (d.isSunday ? "•" : "")}
                        </td>
                      );
                    })}

                    {/* Totals */}
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                      {st.h}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center font-bold text-sky-600 dark:text-sky-400 print:text-black">
                      {st.sa}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center font-bold text-amber-600 dark:text-amber-400 print:text-black">
                      {st.i}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center font-bold text-rose-600 dark:text-rose-400 print:text-black">
                      {st.a}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center font-black bg-slate-50 dark:bg-slate-800/60 print:bg-transparent">
                      {st.percentage}%
                    </td>
                  </tr>
                ))
              )}

              {/* Class Day Sums Footer Row */}
              {studentStats.length > 0 && (
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-200 print:bg-slate-100 print:text-black">
                  <td
                    colSpan={3}
                    className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-right uppercase tracking-wider text-[10px]"
                  >
                    Jumlah Hadir Kelas
                  </td>
                  {daysList.map((d) => {
                    let totalHadirHari = 0;
                    studentStats.forEach((st) => {
                      if (st.dailyStatuses[d.dayNumber] === "Hadir") {
                        totalHadirHari++;
                      }
                    });

                    return (
                      <td
                        key={d.dayNumber}
                        className="border border-slate-300 dark:border-slate-700 print:border-black px-0.5 py-1 text-center text-[10px] print:text-[7px]"
                      >
                        {totalHadirHari > 0 ? totalHadirHari : "-"}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center text-emerald-700 dark:text-emerald-400">
                    {classSummary.grandH}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center text-sky-700 dark:text-sky-400">
                    {classSummary.grandS}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center text-amber-700 dark:text-amber-400">
                    {classSummary.grandI}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center text-rose-700 dark:text-rose-400">
                    {classSummary.grandA}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1 text-center bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200">
                    {classSummary.avgPercentage}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend & Notes */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs print:text-[8px] text-slate-600 dark:text-slate-400 print:text-black">
          <div className="flex items-center space-x-3">
            <span className="font-bold">Keterangan:</span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span><strong>H</strong> = Hadir</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              <span><strong>S</strong> = Sakit</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span><strong>I</strong> = Izin</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span><strong>A</strong> = Alpa</span>
            </span>
          </div>

          <div className="text-[11px] print:text-[8px] italic">
            * Dicetak otomatis melalui Sistem Manajemen Administrasi Guru
          </div>
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

          {/* Guru / Wali Kelas */}
          <div className="text-right space-y-1">
            <p>
              {config.Tempat_Tanda_Tangan || "Kota"},{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="font-semibold">Guru Mata Pelajaran / Wali Kelas</p>

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
    </div>
  );
};
