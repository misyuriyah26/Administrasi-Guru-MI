import React, { useState, useEffect } from "react";
import { Star, Save, CheckCircle2 } from "lucide-react";
import { Siswa, Mapel, DataNilai, Pengaturan } from "../types";
import { batchSaveDocuments, COLLECTIONS } from "../lib/firebase";
import { notifySimpanSuccess, notifySimpanError } from "../lib/swal";

interface InputPenilaianViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  nilaiList: DataNilai[];
  config: Pengaturan;
}

export const InputPenilaianView: React.FC<InputPenilaianViewProps> = ({
  siswaList,
  mapelList,
  nilaiList,
  config
}) => {
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedMapel, setSelectedMapel] = useState<string>("");
  const [jenisPenilaian, setJenisPenilaian] = useState<string>("UH 1");
  const [gradesMap, setGradesMap] = useState<Record<string, number | "">>({});
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const kelasOptions = Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();
  const studentsInClass = siswaList.filter((s) => s.kelas === selectedKelas);

  // Load existing grade records
  useEffect(() => {
    if (selectedKelas && selectedMapel && jenisPenilaian) {
      const existingGrades = nilaiList.filter(
        (n) => n.kelas === selectedKelas && n.mapel === selectedMapel && n.jenis === jenisPenilaian
      );

      const map: Record<string, number | ""> = {};
      studentsInClass.forEach((s) => {
        const found = existingGrades.find((g) => g.idSiswa === s.id || g.idSiswa === s.nisn);
        map[s.id] = found && found.nilai !== "" && found.nilai !== undefined ? found.nilai : "";
      });

      setGradesMap(map);
    }
  }, [selectedKelas, selectedMapel, jenisPenilaian, nilaiList, siswaList]);

  const handleGradeChange = (studentId: string, value: string) => {
    const num = value === "" ? "" : Math.min(100, Math.max(0, Number(value)));
    setGradesMap((prev) => ({ ...prev, [studentId]: num }));
  };

  const handleSaveNilai = async () => {
    if (!selectedKelas || !selectedMapel || !jenisPenilaian) {
      notifySimpanError("Silakan pilih Kelas, Mapel, dan Jenis Penilaian.");
      return;
    }

    if (studentsInClass.length === 0) {
      notifySimpanError("Belum ada siswa di kelas ini.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const itemsToSave: DataNilai[] = studentsInClass.map((s) => {
      const docId = `${selectedKelas}_${selectedMapel}_${jenisPenilaian}_${s.id}`;
      return {
        id: docId,
        waktu: todayStr,
        jenis: jenisPenilaian,
        mapel: selectedMapel,
        kelas: selectedKelas,
        idSiswa: s.id,
        namaSiswa: s.nama,
        nilai: gradesMap[s.id] !== undefined ? gradesMap[s.id] : "",
        namaGuru: config.Nama_Guru || "Guru"
      };
    });

    try {
      await batchSaveDocuments(COLLECTIONS.DATA_NILAI, itemsToSave);
      notifySimpanSuccess(`Nilai ${jenisPenilaian} kelas ${selectedKelas} tersimpan ke Firebase!`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan nilai.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Input Nilai Akademik Siswa
          </h2>
          <p className="text-xs text-slate-500">
            Kelola nilai Ulangan Harian (UH), Tugas, UTS, dan UAS per mata pelajaran.
          </p>
        </div>

        {/* Selection Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
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

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jenis Penilaian *</label>
            <input
              type="text"
              placeholder="Contoh: UH 1 / UTS / Tugas 1"
              value={jenisPenilaian}
              onChange={(e) => setJenisPenilaian(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            />
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

        {/* Grade Entry Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 text-center w-12">No</th>
                <th className="p-3">Nama Lengkap Siswa</th>
                <th className="p-3 text-center w-36">Input Nilai (0-100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {!selectedKelas || !selectedMapel ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    Silakan pilih Kelas, Mapel, dan Jenis Penilaian terlebih dahulu.
                  </td>
                </tr>
              ) : studentsInClass.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    Tidak ada siswa terdaftar di Kelas {selectedKelas}.
                  </td>
                </tr>
              ) : (
                studentsInClass.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{s.nama}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={gradesMap[s.id] !== undefined ? gradesMap[s.id] : ""}
                        onChange={(e) => handleGradeChange(s.id, e.target.value)}
                        className="w-24 text-center px-3 py-1.5 font-black text-sm border-2 rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-blue-600 focus:border-blue-500 outline-none"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveNilai}
            disabled={studentsInClass.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Nilai ke Firebase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
