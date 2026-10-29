import React, { useState, useEffect } from "react";
import { PieChart, ClipboardCheck, Star, Sparkles, Menu } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { KelolaSiswaView } from "./components/KelolaSiswaView";
import { CetakKartuQRView } from "./components/CetakKartuQRView";
import { KelolaMapelView } from "./components/KelolaMapelView";
import { JadwalMengajarView } from "./components/JadwalMengajarView";
import { InputAbsensiView } from "./components/InputAbsensiView";
import { InputPenilaianView } from "./components/InputPenilaianView";
import { AgendaMengajarView } from "./components/AgendaMengajarView";
import { BimbinganWaliView } from "./components/BimbinganWaliView";
import { DownloadPerangkatAjarView } from "./components/DownloadPerangkatAjarView";
import { GeneratorPerangkatAjarAIView } from "./components/GeneratorPerangkatAjarAIView";
import { ModulAjarAIView } from "./components/ModulAjarAIView";
import { AsistenGuruAIView } from "./components/AsistenGuruAIView";
import { GeneratorLkpdAIView } from "./components/GeneratorLkpdAIView";
import { GeneratorAILainnyaView } from "./components/GeneratorAILainnyaView";
import { PenjadwalanOtomatisView } from "./components/PenjadwalanOtomatisView";
import { CetakAbsenBulananView } from "./components/CetakAbsenBulananView";
import { KalenderPendidikanView, PRESET_EVENTS_2026_2027 } from "./components/KalenderPendidikanView";
import { PusatLaporanView } from "./components/PusatLaporanView";
import { PengaturanView } from "./components/PengaturanView";
import { ResetDatabaseView } from "./components/ResetDatabaseView";
import { UserAuthModal } from "./components/UserAuthModal";
import { LoginView } from "./components/LoginView";

import { 
  subscribeCollection, 
  subscribePengaturan, 
  batchSaveDocuments, 
  savePengaturan,
  COLLECTIONS,
  LOCAL_STORAGE_KEYS,
  saveToLocalStorage,
  loadFromLocalStorage,
  subscribeAuth,
  getCurrentLocalUser,
  logoutUser
} from "./lib/firebase";

import { 
  Siswa, 
  Mapel, 
  Jadwal, 
  LogAbsensi, 
  DataNilai, 
  JurnalAgenda, 
  SiswaBimbingan, 
  BimbinganWali, 
  JadwalPengingat,
  KaldikEvent,
  Pengaturan,
  AuthUser 
} from "./types";

const DEFAULT_CONFIG: Pengaturan = {
  Nama_Guru: "Drs. Yefri Haryanto, M.Pd.",
  NIP_Guru: "19850312 201001 1 008",
  Pemerintah: "KEMENTERIAN AGAMA REPUBLIK INDONESIA",
  Nama_Sekolah: "MI SYURIYAH PEBATAN",
  Alamat_Sekolah: "Jalan Raya Pebatan, Kec. Rawa Pitu, Kab. Brebes",
  Nama_Kepsek: "Hamdani, S.Pd., M.Si.",
  NIP_Kepsek: "19780514 200212 1 003",
  Tempat_Tanda_Tangan: "Pebatan",
  Logo_Kiri: "",
  Logo_Kanan: "",
  Logo_Aplikasi: "",
  TandaTangan_Guru: "",
  TandaTangan_Kepsek: "",
  Stempel_Sekolah: "",
  Tampilkan_TTD_Guru: true,
  Tampilkan_TTD_Kepsek: true,
  Tampilkan_Stempel: true,
  Tahun_Pelajaran: "2026/2027"
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("edadmin_theme") === "dark";
  });
  const [isConnected, setIsConnected] = useState(false);

  // Sync dark class on documentElement and body for Tailwind CSS theme switching
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("edadmin_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("edadmin_theme", "light");
    }
  }, [isDarkMode]);

  // Auth User & Modal State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentLocalUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubAuth = subscribeAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Data Collections initialized with local storage cache for instant offline access
  const [siswaList, setSiswaList] = useState<Siswa[]>(() => 
    loadFromLocalStorage<Siswa[]>(LOCAL_STORAGE_KEYS.SISWA, [])
  );
  const [mapelList, setMapelList] = useState<Mapel[]>(() => 
    loadFromLocalStorage<Mapel[]>(LOCAL_STORAGE_KEYS.MAPEL, [])
  );
  const [jadwalList, setJadwalList] = useState<Jadwal[]>(() => 
    loadFromLocalStorage<Jadwal[]>(LOCAL_STORAGE_KEYS.JADWAL, [])
  );
  const [absensiList, setAbsensiList] = useState<LogAbsensi[]>(() => 
    loadFromLocalStorage<LogAbsensi[]>(LOCAL_STORAGE_KEYS.LOG_ABSENSI, [])
  );
  const [nilaiList, setNilaiList] = useState<DataNilai[]>(() => 
    loadFromLocalStorage<DataNilai[]>(LOCAL_STORAGE_KEYS.DATA_NILAI, [])
  );
  const [agendaList, setAgendaList] = useState<JurnalAgenda[]>(() => 
    loadFromLocalStorage<JurnalAgenda[]>(LOCAL_STORAGE_KEYS.JURNAL_AGENDA, [])
  );
  const [siswaBimbinganList, setSiswaBimbinganList] = useState<SiswaBimbingan[]>(() => 
    loadFromLocalStorage<SiswaBimbingan[]>(LOCAL_STORAGE_KEYS.SISWA_BIMBINGAN, [])
  );
  const [bimbinganList, setBimbinganList] = useState<BimbinganWali[]>(() => 
    loadFromLocalStorage<BimbinganWali[]>(LOCAL_STORAGE_KEYS.BIMBINGAN_WALI, [])
  );
  const [pengingatList, setPengingatList] = useState<JadwalPengingat[]>(() => 
    loadFromLocalStorage<JadwalPengingat[]>(LOCAL_STORAGE_KEYS.JADWAL_PENGINGAT, [])
  );
  const [kaldikList, setKaldikList] = useState<KaldikEvent[]>(() => 
    loadFromLocalStorage<KaldikEvent[]>(LOCAL_STORAGE_KEYS.KALDIK, [])
  );
  const [config, setConfig] = useState<Pengaturan>(() => 
    loadFromLocalStorage<Pengaturan>(LOCAL_STORAGE_KEYS.PENGATURAN, DEFAULT_CONFIG)
  );

  // Manual Force Sync to Local Storage
  const handleForceSyncLocal = () => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.SISWA, siswaList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.MAPEL, mapelList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.JADWAL, jadwalList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.LOG_ABSENSI, absensiList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.DATA_NILAI, nilaiList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.JURNAL_AGENDA, agendaList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.SISWA_BIMBINGAN, siswaBimbinganList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.BIMBINGAN_WALI, bimbinganList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.JADWAL_PENGINGAT, pengingatList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.KALDIK, kaldikList);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.PENGATURAN, config);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.LAST_SYNC, new Date().toLocaleString("id-ID"));
  };

  // Subscribe to Firebase real-time collections and automatically persist to local storage
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    unsubs.push(subscribeCollection<Siswa>(COLLECTIONS.SISWA, (data) => {
      setSiswaList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SISWA, data);
      setIsConnected(true);
    }));

    unsubs.push(subscribeCollection<Mapel>(COLLECTIONS.MAPEL, (data) => {
      setMapelList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.MAPEL, data);
    }));

    unsubs.push(subscribeCollection<Jadwal>(COLLECTIONS.JADWAL, (data) => {
      setJadwalList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.JADWAL, data);
    }));

    unsubs.push(subscribeCollection<LogAbsensi>(COLLECTIONS.LOG_ABSENSI, (data) => {
      setAbsensiList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.LOG_ABSENSI, data);
    }));

    unsubs.push(subscribeCollection<DataNilai>(COLLECTIONS.DATA_NILAI, (data) => {
      setNilaiList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.DATA_NILAI, data);
    }));

    unsubs.push(subscribeCollection<JurnalAgenda>(COLLECTIONS.JURNAL_AGENDA, (data) => {
      setAgendaList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.JURNAL_AGENDA, data);
    }));

    unsubs.push(subscribeCollection<SiswaBimbingan>(COLLECTIONS.SISWA_BIMBINGAN, (data) => {
      setSiswaBimbinganList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SISWA_BIMBINGAN, data);
    }));

    unsubs.push(subscribeCollection<BimbinganWali>(COLLECTIONS.BIMBINGAN_WALI, (data) => {
      setBimbinganList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.BIMBINGAN_WALI, data);
    }));

    unsubs.push(subscribeCollection<JadwalPengingat>(COLLECTIONS.JADWAL_PENGINGAT, (data) => {
      setPengingatList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.JADWAL_PENGINGAT, data);
    }));

    unsubs.push(subscribeCollection<KaldikEvent>(COLLECTIONS.KALDIK, (data) => {
      setKaldikList(data);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.KALDIK, data);
    }));

    unsubs.push(subscribePengaturan((cfg) => {
      if (cfg && Object.keys(cfg).length > 0) {
        setConfig((prev) => {
          const updated = { ...prev, ...cfg };
          saveToLocalStorage(LOCAL_STORAGE_KEYS.PENGATURAN, updated);
          return updated;
        });
      }
    }));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Seed sample initial data if database is empty on first boot
  useEffect(() => {
    const seedInitialData = async () => {
      try {
        // Do not re-seed sample data if database was explicitly cleared/wiped by user
        if (
          localStorage.getItem("edadmin_database_cleared") === "true" ||
          config?.isDatabaseCleared === true
        ) {
          return;
        }

        // Seed Siswa if empty
        if (siswaList.length === 0 && isConnected) {
          const sampleSiswa: Siswa[] = [
            { id: "1001", nisn: "0012345678", nama: "Ahmad Fulan", kelas: "VII A" },
            { id: "1002", nisn: "0012345679", nama: "Siti Aminah", kelas: "VII A" },
            { id: "1003", nisn: "0012345680", nama: "Budi Pratama", kelas: "VII B" },
            { id: "1004", nisn: "0012345681", nama: "Rizky Febrian", kelas: "VII B" }
          ];
          await batchSaveDocuments(COLLECTIONS.SISWA, sampleSiswa);
        }

        // Seed Mapel if empty
        if (mapelList.length === 0 && isConnected) {
          const sampleMapel: Mapel[] = [
            { id: "m1", namaMapel: "Informatika", semester: "Ganjil", tahunAjaran: "2026/2027" },
            { id: "m2", namaMapel: "Matematika", semester: "Ganjil", tahunAjaran: "2026/2027" },
            { id: "m3", namaMapel: "Bahasa Indonesia", semester: "Ganjil", tahunAjaran: "2026/2027" },
            { id: "m4", namaMapel: "IPA Terpadu", semester: "Ganjil", tahunAjaran: "2026/2027" }
          ];
          await batchSaveDocuments(COLLECTIONS.MAPEL, sampleMapel);
        }

        // Seed Jadwal if empty
        if (jadwalList.length === 0 && isConnected) {
          const sampleJadwal: Jadwal[] = [
            { id: "j1", hari: "Senin", jam: "07:30 - 09:00", kelas: "VII A", mapel: "Informatika" },
            { id: "j2", hari: "Selasa", jam: "09:15 - 10:45", kelas: "VII B", mapel: "Informatika" },
            { id: "j3", hari: "Rabu", jam: "07:30 - 09:00", kelas: "VII A", mapel: "Informatika" },
            { id: "j4", hari: "Kamis", jam: "10:15 - 11:45", kelas: "VII B", mapel: "Informatika" },
            { id: "j5", hari: "Jumat", jam: "08:00 - 09:30", kelas: "VII A", mapel: "Informatika" }
          ];
          await batchSaveDocuments(COLLECTIONS.JADWAL, sampleJadwal);
        }

        // Seed Jadwal Pengingat if empty
        if (pengingatList.length === 0 && isConnected) {
          const today = new Date();
          const future1 = new Date(); future1.setDate(today.getDate() + 2);
          const future2 = new Date(); future2.setDate(today.getDate() + 5);
          const future3 = new Date(); future3.setDate(today.getDate() + 12);

          const samplePengingat: JadwalPengingat[] = [
            {
              id: "rem_1",
              judul: "Pengumpulan Nilai Formatif Bab 1 - Informatika VII A",
              kategori: "Pengumpulan Nilai",
              tenggatWaktu: future1.toISOString().split("T")[0],
              jam: "23:59",
              prioritas: "Tinggi",
              status: "Belum Selesai",
              pengingatHMin: 3,
              catatan: "Input nilai ke leger & periksa kelengkapan tugas Praktikum Logika.",
              otomatis: true,
              linkMenu: "penilaian",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            },
            {
              id: "rem_2",
              judul: "Pengisian Modul Ajar RPP Mingguan (Pertemuan 3-4)",
              kategori: "Pengisian RPP/Modul",
              tenggatWaktu: future2.toISOString().split("T")[0],
              jam: "16:00",
              prioritas: "Sedang",
              status: "Belum Selesai",
              pengingatHMin: 2,
              catatan: "Susun RPP Deep Learning materi Berpikir Komputasional Kurikulum Merdeka.",
              otomatis: true,
              linkMenu: "modulai",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            },
            {
              id: "rem_3",
              judul: "Rekapitulasi Presensi & Jurnal Mengajar Bulanan",
              kategori: "Absensi & Jurnal",
              tenggatWaktu: future3.toISOString().split("T")[0],
              jam: "17:00",
              prioritas: "Tinggi",
              status: "Belum Selesai",
              pengingatHMin: 5,
              catatan: "Pemeriksaan persentase kehadiran siswa dan validasi jurnal KBM harian.",
              otomatis: true,
              linkMenu: "absensi",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            }
          ];
          await batchSaveDocuments(COLLECTIONS.JADWAL_PENGINGAT, samplePengingat);
        }

        // Seed sample Absensi if empty
        if (absensiList.length === 0 && isConnected) {
          const sampleDates = [
            "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09",
            "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16",
            "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23",
            "2026-10-26", "2026-10-27"
          ];
          const sampleAbs: LogAbsensi[] = [];

          sampleDates.forEach((dStr, dIdx) => {
            sampleAbs.push({
              id: `abs_${dStr}_1001`,
              waktu: dStr,
              tanggal: dStr,
              kelas: "VII A",
              mapel: "Informatika",
              idSiswa: "1001",
              namaSiswa: "Ahmad Fulan",
              status: dIdx === 5 ? "Sakit" : "Hadir",
              bulan: "10",
              tahun: "2026",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            });
            sampleAbs.push({
              id: `abs_${dStr}_1002`,
              waktu: dStr,
              tanggal: dStr,
              kelas: "VII A",
              mapel: "Informatika",
              idSiswa: "1002",
              namaSiswa: "Siti Aminah",
              status: dIdx === 9 ? "Izin" : "Hadir",
              bulan: "10",
              tahun: "2026",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            });
            sampleAbs.push({
              id: `abs_${dStr}_1003`,
              waktu: dStr,
              tanggal: dStr,
              kelas: "VII B",
              mapel: "Informatika",
              idSiswa: "1003",
              namaSiswa: "Budi Pratama",
              status: dIdx === 12 ? "Alpa" : "Hadir",
              bulan: "10",
              tahun: "2026",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            });
            sampleAbs.push({
              id: `abs_${dStr}_1004`,
              waktu: dStr,
              tanggal: dStr,
              kelas: "VII B",
              mapel: "Informatika",
              idSiswa: "1004",
              namaSiswa: "Rizky Febrian",
              status: "Hadir",
              bulan: "10",
              tahun: "2026",
              namaGuru: DEFAULT_CONFIG.Nama_Guru
            });
          });

          await batchSaveDocuments(COLLECTIONS.LOG_ABSENSI, sampleAbs);
        }

        // Seed Kalender Pendidikan if empty
        if (kaldikList.length === 0 && isConnected) {
          const sampleKaldik: KaldikEvent[] = PRESET_EVENTS_2026_2027.map((ev, idx) => ({
            id: `kaldik_${ev.semester}_${idx + 1}`,
            ...ev
          }));
          await batchSaveDocuments(COLLECTIONS.KALDIK, sampleKaldik);
        }

        // Save initial config if empty
        if (!config.Nama_Guru && isConnected) {
          await savePengaturan(DEFAULT_CONFIG);
        }
      } catch (err) {
        console.warn("Notice during initial data seeding (will sync when online):", err);
      }
    };

    seedInitialData();
  }, [isConnected, siswaList.length, mapelList.length, jadwalList.length, absensiList.length, pengingatList.length, kaldikList.length, config.Nama_Guru, config.isDatabaseCleared]);

  const handleSuccessReset = () => {
    setSiswaList([]);
    setMapelList([]);
    setJadwalList([]);
    setAbsensiList([]);
    setNilaiList([]);
    setAgendaList([]);
    setSiswaBimbinganList([]);
    setBimbinganList([]);
    setPengingatList([]);
    setKaldikList([]);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn("Logout notice:", e);
    }
    setCurrentUser(null);
  };

  // Tampilan Login sebelum menggunakan aplikasi ini
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => setCurrentUser(user)}
        config={config}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors ${isDarkMode ? "dark" : ""}`}>
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        config={config}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isDarkMode={isDarkMode}
          onSetDarkMode={(isDark) => setIsDarkMode(isDark)}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          isConnected={isConnected}
          config={config}
          pengingatList={pengingatList}
          onNavigate={(tab) => setActiveTab(tab)}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar pb-24 lg:pb-8">
          {activeTab === "dashboard" && (
            <DashboardView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              jadwalList={jadwalList}
              pengingatList={pengingatList}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === "penjadwalan_otomatis" && (
            <PenjadwalanOtomatisView
              pengingatList={pengingatList}
              mapelList={mapelList}
              jadwalList={jadwalList}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "siswa" && <KelolaSiswaView siswaList={siswaList} />}

          {activeTab === "kartu" && <CetakKartuQRView siswaList={siswaList} config={config} />}

          {activeTab === "mapel" && <KelolaMapelView mapelList={mapelList} />}

          {activeTab === "kaldik" && (
            <KalenderPendidikanView
              kaldikList={kaldikList}
              config={config}
            />
          )}

          {activeTab === "jadwal" && (
            <JadwalMengajarView
              jadwalList={jadwalList}
              mapelList={mapelList}
              siswaList={siswaList}
              config={config}
            />
          )}

          {activeTab === "absensi" && (
            <InputAbsensiView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "cetak_absen_bulanan" && (
            <CetakAbsenBulananView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "penilaian" && (
            <InputPenilaianView
              siswaList={siswaList}
              mapelList={mapelList}
              nilaiList={nilaiList}
              config={config}
            />
          )}

          {activeTab === "agenda" && (
            <AgendaMengajarView
              agendaList={agendaList}
              mapelList={mapelList}
              siswaList={siswaList}
              config={config}
            />
          )}

          {activeTab === "bimbingan" && (
            <BimbinganWaliView
              bimbinganList={bimbinganList}
              siswaBimbinganList={siswaBimbinganList}
              siswaList={siswaList}
              config={config}
            />
          )}

          {activeTab === "downloadperangkat" && <DownloadPerangkatAjarView />}

          {activeTab === "perangkat_ai" && <GeneratorPerangkatAjarAIView config={config} />}

          {activeTab === "modulai" && <ModulAjarAIView config={config} />}

          {activeTab === "asistenai" && <AsistenGuruAIView config={config} />}

          {activeTab === "lkpdai" && <GeneratorLkpdAIView config={config} />}

          {activeTab === "ailainnya" && <GeneratorAILainnyaView />}

          {activeTab === "laporan" && (
            <PusatLaporanView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              agendaList={agendaList}
              bimbinganList={bimbinganList}
              jadwalList={jadwalList}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "pengaturan" && (
            <PengaturanView
              config={config}
              onNavigateToReset={() => setActiveTab("resetdb")}
            />
          )}

          {activeTab === "resetdb" && (
            <ResetDatabaseView onSuccessReset={handleSuccessReset} />
          )}
        </main>

        {/* Native Mobile Bottom Navigation Bar */}
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-30 lg:hidden px-2 py-1.5 pb-safe shadow-lg flex items-center justify-around transition-colors"
          aria-label="Navigasi Bawah Mobile"
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "dashboard"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <PieChart className={`w-5 h-5 ${activeTab === "dashboard" ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab("absensi")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "absensi"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ClipboardCheck className={`w-5 h-5 ${activeTab === "absensi" ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Absensi</span>
          </button>

          <button
            onClick={() => setActiveTab("penilaian")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "penilaian"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Star className={`w-5 h-5 ${activeTab === "penilaian" ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Nilai</span>
          </button>

          <button
            onClick={() => setActiveTab("perangkat_ai")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "perangkat_ai" || activeTab === "modulai" || activeTab === "asistenai"
                ? "text-amber-500 dark:text-amber-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
            }`}
          >
            <Sparkles className={`w-5 h-5 ${activeTab === "perangkat_ai" || activeTab === "modulai" || activeTab === "asistenai" ? "scale-110 text-amber-500" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Asisten AI</span>
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-90"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Menu</span>
          </button>
        </nav>
      </div>

      {/* Google Firebase Auth & Local Storage Manager Modal */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => setCurrentUser(user)}
        onLogoutSuccess={() => setCurrentUser(null)}
        onForceSyncLocal={handleForceSyncLocal}
      />
    </div>
  );
}
