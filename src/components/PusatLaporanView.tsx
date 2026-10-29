import React, { useState } from "react";
import { Printer, FileText, Download, FileSpreadsheet, Calendar, CalendarDays, CalendarRange, Clock } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Siswa, Mapel, LogAbsensi, DataNilai, JurnalAgenda, BimbinganWali, Jadwal, Pengaturan } from "../types";
import { notifyCetakSuccess, notifyCetakError } from "../lib/swal";

interface PusatLaporanViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  absensiList: LogAbsensi[];
  nilaiList: DataNilai[];
  agendaList: JurnalAgenda[];
  bimbinganList: BimbinganWali[];
  jadwalList?: Jadwal[];
  config: Pengaturan;
  onNavigate?: (tab: string) => void;
}

export const PusatLaporanView: React.FC<PusatLaporanViewProps> = ({
  siswaList,
  mapelList,
  absensiList,
  nilaiList,
  agendaList,
  bimbinganList,
  jadwalList = [],
  config,
  onNavigate
}) => {
  // Global Semester Filter State
  const [selectedSemester, setSelectedSemester] = useState<"semua" | "ganjil" | "genap">("ganjil");

  const [selectedAbsensiKelas, setSelectedAbsensiKelas] = useState("");
  const [selectedAbsensiMapel, setSelectedAbsensiMapel] = useState("");

  const [selectedNilaiKelas, setSelectedNilaiKelas] = useState("");
  const [selectedNilaiMapel, setSelectedNilaiMapel] = useState("");

const DAFTAR_BULAN = [
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

  // Riwayat Harian Absensi Filters
  const [riwayatAbsensiTanggal, setRiwayatAbsensiTanggal] = useState<string>("");
  const [riwayatAbsensiKelas, setRiwayatAbsensiKelas] = useState("");

  // Riwayat Input Nilai Filters
  const [riwayatNilaiKelas, setRiwayatNilaiKelas] = useState("");
  const [riwayatNilaiMapel, setRiwayatNilaiMapel] = useState("");

  // Agenda Mengajar Filters
  const [agendaMode, setAgendaMode] = useState<"bulanan" | "semester">("bulanan");
  const [agendaBulan, setAgendaBulan] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [agendaTahun, setAgendaTahun] = useState<string>("2026");
  const [agendaSemester, setAgendaSemester] = useState<"ganjil" | "genap" | "semua">("ganjil");
  const [agendaKelas, setAgendaKelas] = useState<string>("");
  const [agendaMapel, setAgendaMapel] = useState<string>("");

  const kelasOptions = Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();

  // Helper function to filter records by semester
  const filterBySemester = <T extends { tanggal?: string; waktu?: string; created?: string; semester?: string }>(
    item: T,
    sem: "semua" | "ganjil" | "genap"
  ): boolean => {
    if (sem === "semua") return true;

    // Check direct semester string if populated
    if (item.semester) {
      if (sem === "ganjil" && item.semester.toLowerCase().includes("ganjil")) return true;
      if (sem === "genap" && item.semester.toLowerCase().includes("genap")) return true;
    }

    // Check date range
    const dateStr = item.waktu || item.tanggal || item.created;
    if (!dateStr) return true;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    if (sem === "ganjil") {
      // Juli - Desember 2026
      return year === 2026 && month >= 7 && month <= 12;
    } else if (sem === "genap") {
      // Januari - Juni 2027
      return year === 2027 && month >= 1 && month <= 6;
    }

    return true;
  };

  const getSemesterLabel = (sem: "semua" | "ganjil" | "genap") => {
    if (sem === "ganjil") return "SEMESTER GANJIL TA 2026/2027 (JULI - DESEMBER 2026)";
    if (sem === "genap") return "SEMESTER GENAP TA 2026/2027 (JANUARI - JUNI 2027)";
    return "SEMUA PERIODE";
  };

  // Helper to generate official PDF Header & Footer
  const applyOfficialKop = (doc: jsPDF, title: string, isLandscape = false) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    const pemerintah = (config.Pemerintah || "PEMERINTAH PROVINSI / KABUPATEN").toUpperCase();
    const sekolah = (config.Nama_Sekolah || "SMA NEGERI 1 KOTA").toUpperCase();
    const alamat = config.Alamat_Sekolah || "Jalan Pendidikan No. 1";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(pemerintah, centerX, 15, { align: "center" });

    doc.setFontSize(14);
    doc.text(sekolah, centerX, 23, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(alamat, centerX, 30, { align: "center" });

    // Double dividing line
    doc.setLineWidth(1);
    doc.line(10, 34, pageWidth - 10, 34);
    doc.setLineWidth(0.3);
    doc.line(10, 35.5, pageWidth - 10, 35.5);

    // Render Logos if available
    if (config.Logo_Kiri) {
      try {
        doc.addImage(config.Logo_Kiri, "PNG", isLandscape ? 14 : 12, 12, 22, 22);
      } catch (e) {
        console.warn("Could not render Logo_Kiri in PDF:", e);
      }
    }

    const logoKanan = config.Logo_Kanan || config.Logo_Aplikasi;
    if (logoKanan) {
      try {
        doc.addImage(logoKanan, "PNG", pageWidth - (isLandscape ? 36 : 34), 12, 22, 22);
      } catch (e) {
        console.warn("Could not render Logo_Kanan in PDF:", e);
      }
    }

    // Document Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), centerX, 48, { align: "center" });
  };

  const applySignatures = (doc: jsPDF, lastY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = lastY + 20;
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
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
    doc.setFontSize(9);

    // Left Signature (Kepala Sekolah)
    doc.text("Mengetahui,", 20, y);
    doc.text("Kepala Sekolah", 20, y + 5);

    if (config.TandaTangan_Kepsek && config.Tampilkan_TTD_Kepsek !== false) {
      try {
        doc.addImage(config.TandaTangan_Kepsek, "PNG", 18, y + 7, 34, 18);
      } catch (e) {
        console.warn("Could not add TandaTangan_Kepsek to PDF:", e);
      }
    }

    if (config.Stempel_Sekolah && config.Tampilkan_Stempel !== false) {
      try {
        doc.addImage(config.Stempel_Sekolah, "PNG", 12, y + 5, 22, 22);
      } catch (e) {
        console.warn("Could not add Stempel_Sekolah to PDF:", e);
      }
    }

    doc.setFont("helvetica", "bold");
    doc.text(kepsek, 20, y + 30);
    doc.setFont("helvetica", "normal");
    if (nipKepsek) doc.text("NIP. " + nipKepsek, 20, y + 36);

    // Right Signature (Guru)
    const rightX = pageWidth - 60;
    doc.text(`${tempat}, ${dateStr}`, rightX, y, { align: "center" });
    doc.text("Guru Mata Pelajaran / Wali", rightX, y + 5, { align: "center" });

    if (config.TandaTangan_Guru && config.Tampilkan_TTD_Guru !== false) {
      try {
        doc.addImage(config.TandaTangan_Guru, "PNG", rightX - 17, y + 7, 34, 18);
      } catch (e) {
        console.warn("Could not add TandaTangan_Guru to PDF:", e);
      }
    }

    doc.setFont("helvetica", "bold");
    doc.text(namaGuru, rightX, y + 30, { align: "center" });
    doc.setFont("helvetica", "normal");
    if (nipGuru) doc.text("NIP. " + nipGuru, rightX, y + 36, { align: "center" });
  };

  // 1. Export Absensi Rekap PDF
  const handleExportAbsensiPDF = () => {
    if (!selectedAbsensiKelas || !selectedAbsensiMapel) {
      notifyCetakError("Pilih kelas dan mata pelajaran terlebih dahulu!");
      return;
    }

    try {
      const filteredAbsensi = absensiList.filter((a) => filterBySemester(a, selectedSemester));

      const doc = new jsPDF("p", "mm", "a4");
      const semTitle = selectedSemester === "ganjil" ? " (SEMESTER GANJIL TA 2026/2027)" : selectedSemester === "genap" ? " (SEMESTER GENAP TA 2026/2027)" : "";
      applyOfficialKop(doc, `REKAPITULASI ABSENSI SISWA - KELAS ${selectedAbsensiKelas}${semTitle}`);

      doc.setFontSize(9);
      doc.text(`Mata Pelajaran: ${selectedAbsensiMapel}`, 15, 55);

      const students = siswaList.filter((s) => s.kelas === selectedAbsensiKelas);
      const tableBody = students.map((s, idx) => {
        const records = filteredAbsensi.filter(
          (a) => a.kelas === selectedAbsensiKelas && a.mapel === selectedAbsensiMapel && (a.idSiswa === s.id || a.idSiswa === s.nisn)
        );

        let H = 0, I = 0, S = 0, A = 0;
        records.forEach((r) => {
          if (r.status === "Hadir") H++;
          else if (r.status === "Izin") I++;
          else if (r.status === "Sakit") S++;
          else if (r.status === "Alpa") A++;
        });

        const total = H + I + S + A;
        const pct = total > 0 ? Math.round((H / total) * 100) : 0;

        return [idx + 1, s.nisn, s.nama, H, I, S, A, `${pct}%`];
      });

      autoTable(doc, {
        startY: 60,
        head: [["No", "NISN", "Nama Siswa", "Hadir (H)", "Izin (I)", "Sakit (S)", "Alpa (A)", "Persentase"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      doc.save(`Laporan_Absensi_${selectedAbsensiKelas}_${selectedAbsensiMapel}_${selectedSemester}.pdf`);
      notifyCetakSuccess(`Laporan Absensi Kelas ${selectedAbsensiKelas} berhasil diunduh!`);
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Laporan Absensi.");
    }
  };

  // 2. Export Leger Nilai PDF
  const handleExportLegerPDF = () => {
    if (!selectedNilaiKelas || !selectedNilaiMapel) {
      notifyCetakError("Pilih kelas dan mata pelajaran terlebih dahulu!");
      return;
    }

    try {
      const doc = new jsPDF("l", "mm", "a4");
      const semTitle = selectedSemester === "ganjil" ? " (SEMESTER GANJIL TA 2026/2027)" : selectedSemester === "genap" ? " (SEMESTER GENAP TA 2026/2027)" : "";
      applyOfficialKop(doc, `LEGER NILAI AKADEMIK - KELAS ${selectedNilaiKelas}${semTitle}`, true);

      doc.setFontSize(9);
      doc.text(`Mata Pelajaran: ${selectedNilaiMapel}`, 15, 55);

      const students = siswaList.filter((s) => s.kelas === selectedNilaiKelas);
      const rawGrades = nilaiList.filter(
        (n) => n.kelas === selectedNilaiKelas && n.mapel === selectedNilaiMapel && filterBySemester(n, selectedSemester)
      );

      const testTypes = Array.from(new Set(rawGrades.map((g) => g.jenis).filter(Boolean))).sort();

      const headCols = ["No", "NISN", "Nama Siswa", ...testTypes, "Total", "Rata-rata"];

      const tableBody = students.map((s, idx) => {
        const studentGrades = rawGrades.filter((g) => g.idSiswa === s.id || g.idSiswa === s.nisn);
        let sum = 0;
        let count = 0;

        const gradeVals = testTypes.map((t) => {
          const found = studentGrades.find((g) => g.jenis === t);
          if (found && typeof found.nilai === "number") {
            sum += found.nilai;
            count++;
            return found.nilai;
          }
          return "-";
        });

        const avg = count > 0 ? Math.round(sum / count) : 0;

        return [idx + 1, s.nisn, s.nama, ...gradeVals, sum, avg];
      });

      autoTable(doc, {
        startY: 60,
        head: [headCols],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      doc.save(`Leger_Nilai_${selectedNilaiKelas}_${selectedNilaiMapel}_${selectedSemester}.pdf`);
      notifyCetakSuccess(`Leger Nilai Kelas ${selectedNilaiKelas} berhasil diunduh!`);
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Leger Nilai.");
    }
  };

  // 3. Export Agenda Mengajar PDF (Bulanan & Semester)
  const handleExportAgendaPDF = () => {
    try {
      let filteredAgenda = [...agendaList];

      if (agendaMode === "bulanan") {
        filteredAgenda = filteredAgenda.filter((a) => {
          if (!a.tanggal) return false;
          return a.tanggal.startsWith(`${agendaTahun}-${agendaBulan}`);
        });
      } else {
        filteredAgenda = filteredAgenda.filter((a) => filterBySemester(a, agendaSemester));
      }

      if (agendaKelas) {
        filteredAgenda = filteredAgenda.filter((a) => a.kelas === agendaKelas);
      }
      if (agendaMapel) {
        filteredAgenda = filteredAgenda.filter((a) => a.mapel === agendaMapel);
      }

      filteredAgenda.sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));

      if (filteredAgenda.length === 0) {
        notifyCetakError("Tidak ada agenda mengajar yang sesuai filter!");
        return;
      }

      const doc = new jsPDF("l", "mm", "a4");
      const bulanObj = DAFTAR_BULAN.find((b) => b.value === agendaBulan);
      const periodeLabel =
        agendaMode === "bulanan"
          ? `BULAN ${bulanObj ? bulanObj.label.toUpperCase() : agendaBulan} ${agendaTahun}`
          : agendaSemester === "ganjil"
          ? "SEMESTER GANJIL TA 2026/2027"
          : agendaSemester === "genap"
          ? "SEMESTER GENAP TA 2026/2027"
          : "SEMUA PERIODE";

      applyOfficialKop(doc, `JURNAL AGENDA MENGAJAR GURU - ${periodeLabel}`, true);

      // Metadata info text
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Guru Pengampu: ${config.Nama_Guru || "-"}`, 14, 51);
      doc.text(`NIP Guru: ${config.NIP_Guru || "-"}`, 14, 55);
      doc.text(`Kelas: ${agendaKelas || "Semua Kelas"}`, 110, 51);
      doc.text(`Mata Pelajaran: ${agendaMapel || "Semua Mapel"}`, 110, 55);
      doc.text(`Tahun Pelajaran: ${config.Tahun_Pelajaran || "2026/2027"}`, 220, 51);
      doc.text(`Total Pertemuan: ${filteredAgenda.length} Sesi KBM`, 220, 55);

      const tableBody = filteredAgenda.map((a, idx) => [
        idx + 1,
        a.tanggal || "-",
        a.jam || "-",
        a.kelas || "-",
        a.mapel || "-",
        a.materi || "-",
        a.status || "Terlaksana",
        a.absenSiswa || "-",
        a.ket || "-"
      ]);

      autoTable(doc, {
        startY: 60,
        head: [["No", "Tanggal", "Jam", "Kelas", "Mapel", "Materi / Kompetensi", "Status", "Siswa Absen", "Keterangan"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 16, halign: "center" },
          4: { cellWidth: 32 },
          5: { cellWidth: 72 },
          6: { cellWidth: 22, halign: "center" },
          7: { cellWidth: 38 },
          8: { cellWidth: 40 }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      const filename =
        agendaMode === "bulanan"
          ? `Jurnal_Agenda_${bulanObj?.label || agendaBulan}_${agendaTahun}.pdf`
          : `Jurnal_Agenda_Semester_${agendaSemester}.pdf`;

      doc.save(filename);
      notifyCetakSuccess("Jurnal Agenda Mengajar berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Jurnal Agenda.");
    }
  };

  // 4. Export Bimbingan Wali PDF
  const handleExportBimbinganPDF = () => {
    try {
      const doc = new jsPDF("l", "mm", "a4");
      const semTitle = selectedSemester === "ganjil" ? " (SEMESTER GANJIL TA 2026/2027)" : selectedSemester === "genap" ? " (SEMESTER GENAP TA 2026/2027)" : "";
      applyOfficialKop(doc, `LAPORAN CATATAN BIMBINGAN GURU WALI${semTitle}`, true);

      const filteredBimbingan = bimbinganList.filter((b) => filterBySemester(b, selectedSemester));

      const tableBody = filteredBimbingan.map((b, idx) => [
        idx + 1,
        b.tanggal,
        b.namaSiswa,
        b.kelas,
        b.jenis,
        b.kasus,
        b.tindakLanjut
      ]);

      autoTable(doc, {
        startY: 55,
        head: [["No", "Tanggal", "Nama Siswa", "Kelas", "Jenis Masalah", "Deskripsi Kasus", "Solusi & Tindak Lanjut"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      doc.save(`Laporan_Bimbingan_Guru_Wali_${selectedSemester}.pdf`);
      notifyCetakSuccess("Laporan Bimbingan Guru Wali berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Laporan Bimbingan.");
    }
  };

  // 5. Export Riwayat Harian Absensi PDF
  const handleExportRiwayatAbsensiPDF = () => {
    let filtered = absensiList.filter((a) => filterBySemester(a, selectedSemester));
    if (riwayatAbsensiTanggal) {
      filtered = filtered.filter(
        (a) => a.waktu === riwayatAbsensiTanggal || a.tanggal === riwayatAbsensiTanggal
      );
    }
    if (riwayatAbsensiKelas) {
      filtered = filtered.filter((a) => a.kelas === riwayatAbsensiKelas);
    }

    if (filtered.length === 0) {
      notifyCetakError("Tidak ada data riwayat absensi untuk kriteria dan semester yang dipilih.");
      return;
    }

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const semTitle = selectedSemester === "ganjil" ? " (SEMESTER GANJIL TA 2026/2027)" : selectedSemester === "genap" ? " (SEMESTER GENAP TA 2026/2027)" : "";
      const subTitle = `RIWAYAT HARIAN ABSENSI SISWA - ${
        riwayatAbsensiTanggal ? `TANGGAL ${riwayatAbsensiTanggal}` : "SEMUA TANGGAL"
      }${riwayatAbsensiKelas ? ` (KELAS ${riwayatAbsensiKelas})` : ""}${semTitle}`;
      applyOfficialKop(doc, subTitle);

      const tableBody = filtered.map((a, idx) => [
        idx + 1,
        a.waktu || a.tanggal || "-",
        a.kelas || "-",
        a.mapel || "-",
        a.idSiswa || "-",
        a.namaSiswa || "-",
        a.status || "Hadir"
      ]);

      autoTable(doc, {
        startY: 55,
        head: [["No", "Tanggal", "Kelas", "Mata Pelajaran", "ID/NISN", "Nama Siswa", "Status"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      doc.save(`Riwayat_Absensi_${riwayatAbsensiTanggal || "All"}_${selectedSemester}.pdf`);
      notifyCetakSuccess("Laporan Riwayat Absensi berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Riwayat Absensi.");
    }
  };

  // 6. Export Riwayat Input Nilai Akademik PDF
  const handleExportRiwayatNilaiPDF = () => {
    let filtered = nilaiList.filter((n) => filterBySemester(n, selectedSemester));
    if (riwayatNilaiKelas) {
      filtered = filtered.filter((n) => n.kelas === riwayatNilaiKelas);
    }
    if (riwayatNilaiMapel) {
      filtered = filtered.filter((n) => n.mapel === riwayatNilaiMapel);
    }

    if (filtered.length === 0) {
      notifyCetakError("Tidak ada data riwayat input nilai untuk kriteria dan semester yang dipilih.");
      return;
    }

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const semTitle = selectedSemester === "ganjil" ? " (SEMESTER GANJIL TA 2026/2027)" : selectedSemester === "genap" ? " (SEMESTER GENAP TA 2026/2027)" : "";
      const subTitle = `RIWAYAT INPUT NILAI AKADEMIK ${
        riwayatNilaiKelas ? `- KELAS ${riwayatNilaiKelas}` : ""
      }${riwayatNilaiMapel ? ` (${riwayatNilaiMapel})` : ""}${semTitle}`;
      applyOfficialKop(doc, subTitle);

      const tableBody = filtered.map((n, idx) => {
        const student = siswaList.find((s) => s.id === n.idSiswa || s.nisn === n.idSiswa);
        return [
          idx + 1,
          n.idSiswa || "-",
          student ? student.nama : n.namaSiswa || "-",
          n.kelas || "-",
          n.mapel || "-",
          n.jenis || "-",
          n.nilai !== undefined ? n.nilai : "-"
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [["No", "NISN/ID", "Nama Siswa", "Kelas", "Mata Pelajaran", "Jenis Evaluasi", "Nilai"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      doc.save(`Riwayat_Nilai_${riwayatNilaiKelas || "All"}_${riwayatNilaiMapel || "All"}.pdf`);
      notifyCetakSuccess("Laporan Riwayat Nilai berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Riwayat Nilai.");
    }
  };

  // 7. Export Jadwal Mengajar PDF
  const handleExportJadwalPDF = () => {
    if (!jadwalList || jadwalList.length === 0) {
      notifyCetakError("Belum ada jadwal mengajar yang tercatat.");
      return;
    }

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const semTitle = selectedSemester === "ganjil" ? " (SEMESTER GANJIL TA 2026/2027)" : selectedSemester === "genap" ? " (SEMESTER GENAP TA 2026/2027)" : "";
      applyOfficialKop(doc, `JADWAL MENGAJAR GURU${semTitle}`);

      const sorted = [...jadwalList].sort((a, b) => {
        const order = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const diff = order.indexOf(a.hari) - order.indexOf(b.hari);
        if (diff !== 0) return diff;
        return a.jam.localeCompare(b.jam);
      });

      const tableBody = sorted.map((j, idx) => [
        idx + 1,
        j.hari,
        j.jam,
        `Kelas ${j.kelas}`,
        j.mapel,
        "Tatap Muka"
      ]);

      autoTable(doc, {
        startY: 55,
        head: [["No", "Hari", "Jam Pelajaran (WIB)", "Kelas", "Mata Pelajaran", "Keterangan"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 2.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      applySignatures(doc, finalY);

      doc.save(`Jadwal_Mengajar_${selectedSemester}.pdf`);
      notifyCetakSuccess("Laporan Jadwal Mengajar berhasil diunduh ke PDF!");
    } catch (err: any) {
      notifyCetakError(err.message || "Gagal mencetak Jadwal Mengajar.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            Pusat Cetak Laporan PDF Resmi
          </h2>
          <p className="text-xs text-slate-500">
            Cetak dokumen administrasi guru berformat resmi lengkap dengan Kop Surat Sekolah, Tabel, dan Tanda Tangan.
          </p>
        </div>

        {/* Filter Opsi Cetak Per Semester */}
        <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Opsi Cetak Per Semester (Tahun Ajaran 2026/2027)</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Filter periode waktu data laporan yang akan dicetak pada seluruh dokumen PDF.
            </p>
          </div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as any)}
            className="w-full md:w-auto px-3.5 py-2 text-xs font-bold border rounded-xl bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 outline-none shadow-xs cursor-pointer"
          >
            <option value="ganjil">Semester Ganjil 2026/2027 (Juli - Desember 2026)</option>
            <option value="genap">Semester Genap 2026/2027 (Januari - Juni 2027)</option>
            <option value="semua">Semua Semester / Tanpa Filter Periodik</option>
          </select>
        </div>

        {/* Featured Card: Cetak Rekap Absen Bulanan Matriks 1-31 */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 p-5 rounded-2xl border border-teal-200 dark:border-teal-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white inline-block">
              Fitur Baru
            </span>
            <h3 className="font-extrabold text-sm text-teal-950 dark:text-teal-200 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Buku Rekapitulasi Presensi & Absensi Bulanan (Format Matriks Hari 1-31)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Cetak format buku absensi bulanan resmi dengan grid tanggal 1 s/d 31, kalkulasi otomatis Hadir, Sakit, Izin, Alpa, persentase kehadiran per siswa, serta Kop Resmi dan Tanda Tangan.
            </p>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate("cetak_absen_bulanan")}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center space-x-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Buka Cetak Absen Bulanan &rarr;</span>
            </button>
          )}
        </div>

        {/* Featured Card 2: Kalender Pendidikan & Hari Efektif Belajar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white inline-block">
              Akademik & Kurikulum
            </span>
            <h3 className="font-extrabold text-sm text-blue-950 dark:text-blue-200 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Kalender Pendidikan (Kaldik) & Rekap Hari Efektif Belajar (HEB)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Cetak format kalender akademik resmi per semester atau 1 tahun penuh, dilengkapi matriks kalender bulanan, rincian minggu efektif, legenda kegiatan, serta Kop Surat dan Tanda Tangan Resmi.
            </p>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate("kaldik")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center space-x-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <CalendarRange className="w-4 h-4" />
              <span>Buka Kalender Pendidikan &rarr;</span>
            </button>
          )}
        </div>

        {/* Featured Card 3: Jurnal Agenda Mengajar Guru (Bulanan & Semester) */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white inline-block">
              Jurnal Mengajar Guru
            </span>
            <h3 className="font-extrabold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Jurnal Agenda Mengajar Bulanan & Per Semester</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Cetak jurnal agenda mengajar lengkap dengan filter periode bulanan atau per semester, rekap persentase KBM terlaksana, catatan siswa absen, serta Kop Surat Resmi dan Tanda Tangan Pengesahan.
            </p>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate("agenda")}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center space-x-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Buka Studio Cetak Agenda &rarr;</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Absensi */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600" />
              Laporan Rekapituasi Absensi Siswa
            </h3>
            <p className="text-xs text-slate-500">
              Menghasilkan rekap hitungan Hadir, Izin, Sakit, Alpa, dan persentase kehadiran per kelas.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <select
                value={selectedAbsensiKelas}
                onChange={(e) => setSelectedAbsensiKelas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Pilih Kelas</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>

              <select
                value={selectedAbsensiMapel}
                onChange={(e) => setSelectedAbsensiMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Pilih Mapel</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.namaMapel}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportAbsensiPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Absensi</span>
            </button>
          </div>

          {/* Card 2: Leger Nilai */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600" />
              Laporan Leger Nilai Akademik
            </h3>
            <p className="text-xs text-slate-500">
              Format matrik lanskap seluruh nilai tugas, UH, UTS, UAS beserta total dan rata-rata.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <select
                value={selectedNilaiKelas}
                onChange={(e) => setSelectedNilaiKelas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Pilih Kelas</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>

              <select
                value={selectedNilaiMapel}
                onChange={(e) => setSelectedNilaiMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Pilih Mapel</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.namaMapel}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportLegerPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Leger Nilai</span>
            </button>
          </div>

          {/* Card 3: Agenda Mengajar */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Jurnal Agenda Mengajar
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold rounded-md">
                Bulanan & Semester
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dokumen resmi jurnal mengajar harian, bulanan, atau per semester untuk arsip KBM dan supervisi.
            </p>

            {/* Mode Periode Toggle */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAgendaMode("bulanan")}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  agendaMode === "bulanan"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Cetak Bulanan
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode("semester")}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  agendaMode === "semester"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Cetak Per Semester
              </button>
            </div>

            {/* Sub-Filters */}
            {agendaMode === "bulanan" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Pilih Bulan</label>
                  <select
                    value={agendaBulan}
                    onChange={(e) => setAgendaBulan(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                  >
                    {DAFTAR_BULAN.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tahun</label>
                  <select
                    value={agendaTahun}
                    onChange={(e) => setAgendaTahun(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Pilih Semester</label>
                <select
                  value={agendaSemester}
                  onChange={(e) => setAgendaSemester(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="ganjil">Semester Ganjil 2026/2027 (Juli - Desember 2026)</option>
                  <option value="genap">Semester Genap 2026/2027 (Januari - Juni 2027)</option>
                  <option value="semua">Semua Semester / 1 Tahun Ajaran</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <select
                value={agendaKelas}
                onChange={(e) => setAgendaKelas(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Semua Kelas</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>

              <select
                value={agendaMapel}
                onChange={(e) => setAgendaMapel(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Semua Mapel</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.namaMapel}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportAgendaPDF}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF Agenda</span>
              </button>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("agenda")}
                  title="Buka pratinjau lengkap dan cetak browser"
                  className="px-3 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Bimbingan BK */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600" />
              Catatan Bimbingan Guru Wali
            </h3>
            <p className="text-xs text-slate-500">
              Laporan penanganan kasus dan konseling siswa perwalian untuk arsip sekolah.
            </p>
            <button
              onClick={handleExportBimbinganPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors mt-4"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Bimbingan Guru Wali</span>
            </button>
          </div>

          {/* Card 5: Riwayat Harian Absensi */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600" />
              Laporan Riwayat Harian Absensi
            </h3>
            <p className="text-xs text-slate-500">
              Cetak laporan detail riwayat scan dan input absensi harian per tanggal dan kelas.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tanggal</label>
                <input
                  type="date"
                  value={riwayatAbsensiTanggal}
                  onChange={(e) => setRiwayatAbsensiTanggal(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Kelas</label>
                <select
                  value={riwayatAbsensiKelas}
                  onChange={(e) => setRiwayatAbsensiKelas(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="">Semua Kelas</option>
                  {kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleExportRiwayatAbsensiPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Riwayat Absensi</span>
            </button>
          </div>

          {/* Card 6: Riwayat Input Nilai Akademik */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600" />
              Laporan Riwayat Input Nilai Akademik
            </h3>
            <p className="text-xs text-slate-500">
              Daftar riwayat seluruh input nilai tugas, UH, UTS, dan UAS per kelas dan mata pelajaran.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Kelas</label>
                <select
                  value={riwayatNilaiKelas}
                  onChange={(e) => setRiwayatNilaiKelas(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="">Semua Kelas</option>
                  {kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Mapel</label>
                <select
                  value={riwayatNilaiMapel}
                  onChange={(e) => setRiwayatNilaiMapel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="">Semua Mapel</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.namaMapel}>
                      {m.namaMapel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleExportRiwayatNilaiPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Riwayat Nilai</span>
            </button>
          </div>

          {/* Card 7: Jadwal Mengajar Guru */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              Laporan Jadwal Mengajar Guru
            </h3>
            <p className="text-xs text-slate-500">
              Dokumen resmi jadwal tatap muka KBM mingguan lengkap dengan Kop Surat Sekolah & Tanda Tangan Pengesahan Kepala Sekolah.
            </p>

            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-between">
              <span className="text-slate-500">Total Sesi Mengajar:</span>
              <span className="font-black text-blue-600 dark:text-blue-400">
                {jadwalList.length} Sesi Pertemuan / Minggu
              </span>
            </div>

            <button
              onClick={handleExportJadwalPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Cetak PDF Jadwal Mengajar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
