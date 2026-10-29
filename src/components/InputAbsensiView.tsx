import React, { useState, useEffect, useRef } from "react";
import { ClipboardCheck, Camera, CheckCircle2, Save, UserCheck, AlertCircle, CalendarDays } from "lucide-react";
import jsQR from "jsqr";
import { Siswa, Mapel, LogAbsensi, Pengaturan } from "../types";
import { saveDocument, batchSaveDocuments, COLLECTIONS } from "../lib/firebase";
import { notifySimpanSuccess, notifySimpanError } from "../lib/swal";

interface InputAbsensiViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  absensiList: LogAbsensi[];
  config: Pengaturan;
  onNavigate?: (tab: string) => void;
}

export const InputAbsensiView: React.FC<InputAbsensiViewProps> = ({
  siswaList,
  mapelList,
  absensiList,
  config,
  onNavigate
}) => {
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedMapel, setSelectedMapel] = useState<string>("");
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Local attendance state mapping: studentId -> status
  const [attendanceState, setAttendanceState] = useState<Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'>>({});

  // QR Scanner refs & state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Siap melakukan scan kartu...");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [manualScanNisn, setManualScanNisn] = useState<string>("");
  const isScanningRef = useRef<boolean>(false);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const kelasOptions = Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();
  const studentsInClass = siswaList.filter((s) => s.kelas === selectedKelas);

  // Load existing records for selected Date + Class + Mapel
  useEffect(() => {
    if (tanggal && selectedKelas && selectedMapel) {
      const existingRecords = absensiList.filter(
        (a) =>
          (a.waktu === tanggal || a.tanggal === tanggal) &&
          a.kelas === selectedKelas &&
          a.mapel === selectedMapel
      );

      const stateMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {};
      studentsInClass.forEach((s) => {
        const found = existingRecords.find((rec) => rec.idSiswa === s.id || rec.idSiswa === s.nisn);
        stateMap[s.id] = found ? found.status : "Hadir";
      });

      setAttendanceState(stateMap);
    }
  }, [tanggal, selectedKelas, selectedMapel, absensiList, siswaList]);

  // Set All Hadir
  const handleSetHadirSemua = () => {
    const updated: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {};
    studentsInClass.forEach((s) => {
      updated[s.id] = "Hadir";
    });
    setAttendanceState(updated);
  };

  // Change individual status
  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa') => {
    setAttendanceState((prev) => ({ ...prev, [studentId]: status }));
  };

  // Save batch attendance to Firestore
  const handleSaveAbsensi = async () => {
    if (!tanggal || !selectedKelas || !selectedMapel) {
      notifySimpanError("Silakan pilih Tanggal, Kelas, dan Mata Pelajaran.");
      return;
    }

    if (studentsInClass.length === 0) {
      notifySimpanError("Belum ada siswa di kelas ini.");
      return;
    }

    const yearMonth = tanggal.split("-");
    const thn = yearMonth[0] || "2026";
    const bln = yearMonth[1] || "01";

    const itemsToSave: LogAbsensi[] = studentsInClass.map((s) => {
      const docId = `${tanggal}_${selectedKelas}_${selectedMapel}_${s.id}`;
      return {
        id: docId,
        waktu: tanggal,
        tanggal: tanggal,
        kelas: selectedKelas,
        mapel: selectedMapel,
        idSiswa: s.id,
        namaSiswa: s.nama,
        status: attendanceState[s.id] || "Hadir",
        bulan: bln,
        tahun: thn,
        namaGuru: config.Nama_Guru || "Guru"
      };
    });

    try {
      await batchSaveDocuments(COLLECTIONS.LOG_ABSENSI, itemsToSave);
      notifySimpanSuccess(`Absensi kelas ${selectedKelas} (${itemsToSave.length} siswa) tersimpan ke Firebase!`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan absensi.");
    }
  };

  // Manual Scan Submit
  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanNisn.trim()) return;

    const val = manualScanNisn.trim();
    const matched = siswaList.find((s) => s.nisn === val || s.id === val);

    if (matched) {
      setAttendanceState((prev) => ({ ...prev, [matched.id]: "Hadir" }));
      const statusText = `BERHASIL: ${matched.nama} (NISN: ${matched.nisn}) -> HADIR`;
      setScanStatus(statusText);
      notifySimpanSuccess(statusText);

      const docId = `${tanggal}_${selectedKelas || matched.kelas}_${selectedMapel || 'Scan'}_${matched.id}`;
      saveDocument(COLLECTIONS.LOG_ABSENSI, docId, {
        id: docId,
        waktu: tanggal,
        tanggal: tanggal,
        kelas: selectedKelas || matched.kelas,
        mapel: selectedMapel || "Absensi QR",
        idSiswa: matched.id,
        namaSiswa: matched.nama,
        status: "Hadir",
        bulan: tanggal.split("-")[1] || "01",
        tahun: tanggal.split("-")[0] || "2026",
        namaGuru: config.Nama_Guru || "Guru"
      });
      setManualScanNisn("");
    } else {
      const errorText = `NISN/Kode '${val}' tidak ditemukan dalam database siswa.`;
      setScanStatus(errorText);
      notifySimpanError(errorText);
    }
  };

  // Start Camera Process
  const startCameraProcess = async () => {
    setCameraError("");
    setScanStatus("Mengaktifkan kamera...");

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        isScanningRef.current = true;
        setScanStatus("Kamera aktif. Arahkan QR Code Kartu Pelajar...");
        scanLoop();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraActive(false);
      isScanningRef.current = false;
      const errMsg = err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
        ? "Izin kamera ditolak browser. Silakan izinkan akses kamera pada ikon gembok di address bar atau buka di Tab Baru."
        : "Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.";
      setCameraError(errMsg);
      setScanStatus("Kamera tidak aktif.");
    }
  };

  const stopCameraProcess = () => {
    isScanningRef.current = false;
    setCameraActive(false);
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanLoop = () => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const codeVal = code.data.trim();
          const matchedSiswa = siswaList.find(
            (s) => s.nisn === codeVal || s.id === codeVal
          );

          if (matchedSiswa) {
            setAttendanceState((prev) => ({ ...prev, [matchedSiswa.id]: "Hadir" }));
            const successText = `BERHASIL: ${matchedSiswa.nama} (NISN: ${matchedSiswa.nisn}) -> HADIR`;
            setScanStatus(successText);
            setStatusMsg({ type: "success", text: successText });

            const docId = `${tanggal}_${selectedKelas || matchedSiswa.kelas}_${selectedMapel || 'Scan'}_${matchedSiswa.id}`;
            saveDocument(COLLECTIONS.LOG_ABSENSI, docId, {
              id: docId,
              waktu: tanggal,
              tanggal: tanggal,
              kelas: selectedKelas || matchedSiswa.kelas,
              mapel: selectedMapel || "Scan QR",
              idSiswa: matchedSiswa.id,
              namaSiswa: matchedSiswa.nama,
              status: "Hadir",
              bulan: tanggal.split("-")[1] || "01",
              tahun: tanggal.split("-")[0] || "2026",
              namaGuru: config.Nama_Guru || "Guru"
            });
          } else {
            setScanStatus(`QR Terbaca: '${codeVal}' (Data siswa tidak ditemukan)`);
          }
        }
      }
    }

    if (isScanningRef.current) {
      requestAnimationFrame(scanLoop);
    }
  };

  // Camera lifecycle trigger when mode changes
  useEffect(() => {
    if (mode === "scan") {
      startCameraProcess();
    } else {
      stopCameraProcess();
    }

    return () => {
      stopCameraProcess();
    };
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Header and mode toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Input Absensi Harian Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Catat presensi harian secara manual atau otomatis menggunakan QR Scanner Kamera.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("cetak_absen_bulanan")}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Cetak Rekap Bulanan &rarr;</span>
              </button>
            )}

            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                onClick={() => setMode("manual")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  mode === "manual"
                    ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Input Manual
              </button>
              <button
                onClick={() => setMode("scan")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer ${
                  mode === "scan"
                    ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan QR Kamera</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal *</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pilih Kelas *</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pilih Mata Pelajaran *</label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
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
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Manual Attendance Mode */}
        {mode === "manual" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleSetHadirSemua}
                disabled={studentsInClass.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>Hadir Semua</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center w-24">Hadir</th>
                    <th className="p-3 text-center w-24">Izin</th>
                    <th className="p-3 text-center w-24">Sakit</th>
                    <th className="p-3 text-center w-24">Alpa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {!selectedKelas || !selectedMapel ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Silakan pilih Tanggal, Kelas, dan Mata Pelajaran terlebih dahulu.
                      </td>
                    </tr>
                  ) : studentsInClass.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Tidak ada siswa di Kelas {selectedKelas}.
                      </td>
                    </tr>
                  ) : (
                    studentsInClass.map((s, idx) => {
                      const currentStatus = attendanceState[s.id] || "Hadir";
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{s.nama}</td>

                          {/* Status Options */}
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Hadir"}
                              onChange={() => handleStatusChange(s.id, "Hadir")}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Izin"}
                              onChange={() => handleStatusChange(s.id, "Izin")}
                              className="w-4 h-4 accent-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Sakit"}
                              onChange={() => handleStatusChange(s.id, "Sakit")}
                              className="w-4 h-4 accent-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Alpa"}
                              onChange={() => handleStatusChange(s.id, "Alpa")}
                              className="w-4 h-4 accent-red-600 cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveAbsensi}
                disabled={studentsInClass.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Absensi ke Firebase</span>
              </button>
            </div>
          </div>
        )}

        {/* Scan Mode */}
        {mode === "scan" && (
          <div className="space-y-5 text-center py-4">
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Arahkan QR Code Kartu Pelajar siswa ke kamera atau masukkan NISN secara manual/barcode reader di bawah.
            </p>

            {cameraError && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-semibold max-w-md mx-auto space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-amber-700 dark:text-amber-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Akses Kamera Dibatasi</span>
                </div>
                <p className="text-[11px] leading-relaxed">{cameraError}</p>
              </div>
            )}

            <div className="relative w-full max-w-sm mx-auto aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden shadow-lg border-2 border-blue-600 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {cameraActive && (
                <div className="absolute inset-0 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none animate-pulse m-8" />
              )}
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={cameraActive ? stopCameraProcess : startCameraProcess}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-xs ${
                  cameraActive
                    ? "bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{cameraActive ? "Hentikan Kamera" : "Aktifkan Kamera"}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 text-xs font-bold max-w-md mx-auto">
              {scanStatus}
            </div>

            {/* Alternative Manual Barcode / NISN Input */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto">
              <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">
                Atau Input / Scan NISN Manual
              </p>
              <form onSubmit={handleManualScanSubmit} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ketik NISN atau scan barcode..."
                  value={manualScanNisn}
                  onChange={(e) => setManualScanNisn(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                >
                  Proses
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
