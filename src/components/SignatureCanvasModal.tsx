import React, { useRef, useState, useEffect } from "react";
import { 
  X, 
  RotateCcw, 
  Trash2, 
  Check, 
  PenTool, 
  Stamp, 
  Sparkles,
  Sliders,
  Palette
} from "lucide-react";

interface SignatureCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: "ttd_guru" | "ttd_kepsek" | "stempel";
  defaultTextSekolah?: string;
  defaultTextPemda?: string;
  onSave: (dataUrl: string) => void;
}

export const SignatureCanvasModal: React.FC<SignatureCanvasModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  defaultTextSekolah = "SMP NEGERI 3 KERINCI",
  defaultTextPemda = "DINAS PENDIDIKAN",
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<string>(
    type === "stempel" ? "#1e40af" : "#0f172a"
  );
  const [strokeWidth, setStrokeWidth] = useState<number>(type === "stempel" ? 4 : 3);
  const [paths, setPaths] = useState<Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>>([]);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Generator Stempel state
  const [stempelMode, setStempelMode] = useState<"draw" | "generator">(
    type === "stempel" ? "generator" : "draw"
  );
  const [teksAtas, setTeksAtas] = useState(defaultTextSekolah || "SMP NEGERI 3 KERINCI");
  const [teksBawah, setTeksBawah] = useState(defaultTextPemda || "KABUPATEN / KOTA");
  const [teksTengah, setTeksTengah] = useState("SEKOLAH");
  const [warnaStempel, setWarnaStempel] = useState<string>("#1e40af"); // Biru resmi stempel
  const [sudutStempel, setSudutStempel] = useState<number>(-4); // -4 deg natural stamp tilt

  useEffect(() => {
    if (isOpen) {
      setPaths([]);
      setCurrentPoints([]);
      if (type === "stempel") {
        setStempelMode("generator");
        setTeksAtas(defaultTextSekolah || "SMP NEGERI 3 KERINCI");
        setTeksBawah(defaultTextPemda || "DINAS PENDIDIKAN");
        // Give time for canvas ref to mount then render
        setTimeout(drawGeneratedStamp, 50);
      } else {
        setStempelMode("draw");
        setTimeout(initCanvas, 50);
      }
    }
  }, [isOpen, type, defaultTextSekolah, defaultTextPemda]);

  // Re-draw generated stamp whenever stamp parameters change
  useEffect(() => {
    if (isOpen && type === "stempel" && stempelMode === "generator") {
      drawGeneratedStamp();
    }
  }, [teksAtas, teksBawah, teksTengah, warnaStempel, sudutStempel, stempelMode, isOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawPaths = (allPaths: typeof paths) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allPaths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        const xc = (path.points[i].x + path.points[i - 1].x) / 2;
        const yc = (path.points[i].y + path.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i - 1].x, path.points[i - 1].y, xc, yc);
      }
      ctx.lineTo(path.points[path.points.length - 1].x, path.points[path.points.length - 1].y);
      ctx.stroke();
    });
  };

  // Canvas drawing events
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (stempelMode === "generator") return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    setCurrentPoints([coords]);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || stempelMode === "generator") return;
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    const newPoints = [...currentPoints, coords];
    setCurrentPoints(newPoints);

    // Live stroke draw
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (newPoints.length > 1) {
      const p1 = newPoints[newPoints.length - 2];
      const p2 = newPoints[newPoints.length - 1];
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  };

  const handleEnd = () => {
    if (!isDrawing || stempelMode === "generator") return;
    setIsDrawing(false);
    if (currentPoints.length > 0) {
      const newPath = {
        points: currentPoints,
        color: penColor,
        width: strokeWidth
      };
      const updatedPaths = [...paths, newPath];
      setPaths(updatedPaths);
      setCurrentPoints([]);
      redrawPaths(updatedPaths);
    }
  };

  const handleUndo = () => {
    if (paths.length === 0) return;
    const updated = paths.slice(0, paths.length - 1);
    setPaths(updated);
    redrawPaths(updated);
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPoints([]);
    initCanvas();
  };

  // AUTOMATIC OFFICIAL INDONESIAN SCHOOL STAMP GENERATOR
  const drawGeneratedStamp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    // Apply slight tilt for realistic wet stamp appearance
    ctx.rotate((sudutStempel * Math.PI) / 180);

    ctx.strokeStyle = warnaStempel;
    ctx.fillStyle = warnaStempel;

    // 1. Outer Circle (Thick official boundary)
    const outerR = 120;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Inner Double Circle
    const innerR = 86;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Central horizontal bar lines for school accreditation / symbol
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-innerR + 6, -18);
    ctx.lineTo(innerR - 6, -18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-innerR + 6, 18);
    ctx.lineTo(innerR - 6, 18);
    ctx.stroke();

    // 4. Center Text or Emblem
    ctx.font = "bold 18px 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(teksTengah.toUpperCase() || "SEKOLAH", 0, 0);

    // 5. Draw decorative side stars (★) between top and bottom arc
    const starR = (outerR + innerR) / 2;
    ctx.font = "bold 15px 'Arial', sans-serif";
    ctx.fillText("★", -starR, 4);
    ctx.fillText("★", starR, 4);

    // 6. Draw Curved Text Along Top Arc (Teks Atas: Nama Sekolah)
    const arcR = (outerR + innerR) / 2;
    drawCurvedText(ctx, teksAtas.toUpperCase(), 0, 0, arcR, true);

    // 7. Draw Curved Text Along Bottom Arc (Teks Bawah: Nama Pemda / Kota)
    drawCurvedText(ctx, teksBawah.toUpperCase(), 0, 0, arcR, false);

    ctx.restore();
  };

  // Helper for drawing text along a circular arc
  const drawCurvedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    radius: number,
    isTop: boolean
  ) => {
    if (!text) return;
    ctx.save();
    ctx.font = "bold 14px 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const chars = text.split("");
    const totalChars = chars.length;
    // Calculate total angle span based on text length (clamp between 60deg and 150deg)
    const charSpacing = 0.085; // radians per character
    const totalAngle = Math.min(Math.PI * 0.85, totalChars * charSpacing);
    const startAngle = isTop 
      ? -Math.PI / 2 - totalAngle / 2 
      : Math.PI / 2 + totalAngle / 2;
    const angleStep = totalAngle / Math.max(1, totalChars - 1);

    for (let i = 0; i < totalChars; i++) {
      const char = chars[i];
      const angle = isTop 
        ? startAngle + i * angleStep 
        : startAngle - i * angleStep;

      ctx.save();
      ctx.translate(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
      ctx.rotate(angle + (isTop ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas has content
    if (stempelMode === "draw" && paths.length === 0) {
      alert("Silakan goreskan tanda tangan atau pilih generator stempel terlebih dahulu.");
      return;
    }

    // Crop or export as transparent PNG
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              {type === "stempel" ? <Stamp className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500">
                {type === "stempel"
                  ? "Generate stempel resmi bulat sekolah otomatis atau gores manual langsung."
                  : "Goreskan tanda tangan langsung menggunakan mouse atau jari/layar sentuh HP."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-mode for Stempel: Generator Otomatis vs Gores Manual */}
        {type === "stempel" && (
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStempelMode("generator")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                stempelMode === "generator"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generator Stempel Bulat Otomatis</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStempelMode("draw");
                setTimeout(initCanvas, 30);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                stempelMode === "draw"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Gores Manual Bebas</span>
            </button>
          </div>
        )}

        {/* CONTROLS BAR */}
        {stempelMode === "draw" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Color Palette */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Warna:
              </span>
              {[
                { name: "Hitam", value: "#0f172a" },
                { name: "Biru Dokumen", value: "#1e3a8a" },
                { name: "Biru Stempel", value: "#1d4ed8" },
                { name: "Ungu Resmi", value: "#6b21a8" }
              ].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setPenColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                    penColor === c.value
                      ? "border-amber-400 scale-110 shadow-sm"
                      : "border-white dark:border-slate-800"
                  }`}
                  title={c.name}
                />
              ))}
            </div>

            {/* Stroke Width */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Ketebalan:
              </span>
              {[2, 3, 4, 6].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setStrokeWidth(w)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    strokeWidth === w
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Undo & Clear */}
            <div className="flex items-center space-x-1 ml-auto">
              <button
                type="button"
                onClick={handleUndo}
                disabled={paths.length === 0}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center space-x-1 cursor-pointer disabled:opacity-40"
                title="Batalkan goresan terakhir"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 flex items-center space-x-1 cursor-pointer"
                title="Kosongkan canvas"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        ) : (
          /* Stempel Generator Form Controls */
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Teks Lingkar Atas (Nama Sekolah)
                </label>
                <input
                  type="text"
                  value={teksAtas}
                  onChange={(e) => setTeksAtas(e.target.value)}
                  placeholder="SMP NEGERI 3 KERINCI"
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Teks Lingkar Bawah (Dinas / Daerah)
                </label>
                <input
                  type="text"
                  value={teksBawah}
                  onChange={(e) => setTeksBawah(e.target.value)}
                  placeholder="DINAS PENDIDIKAN"
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Teks Tengah Stempel
                </label>
                <input
                  type="text"
                  value={teksTengah}
                  onChange={(e) => setTeksTengah(e.target.value)}
                  placeholder="SEKOLAH / TERAKREDITASI"
                  className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tinta:</span>
                  {[
                    { label: "Biru Resmi", color: "#1d4ed8" },
                    { label: "Ungu Resmi", color: "#6b21a8" },
                    { label: "Biru Tua", color: "#1e3a8a" },
                    { label: "Merah", color: "#dc2626" }
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setWarnaStempel(item.color)}
                      style={{ backgroundColor: item.color }}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                        warnaStempel === item.color
                          ? "border-amber-400 scale-110 shadow-sm"
                          : "border-white dark:border-slate-800"
                      }`}
                      title={item.label}
                    />
                  ))}
                </div>

                <div className="flex items-center space-x-1 ml-auto">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Kemiringan:</span>
                  {[-6, -3, 0, 3].map((ang) => (
                    <button
                      key={ang}
                      type="button"
                      onClick={() => setSudutStempel(ang)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        sudutStempel === ang
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {ang}°
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CANVAS WORKSPACE */}
        <div className="flex flex-col items-center justify-center p-2 bg-slate-100 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={260}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className={`bg-white dark:bg-slate-900 rounded-xl shadow-inner max-w-full touch-none ${
              stempelMode === "draw" ? "cursor-crosshair" : "cursor-default"
            }`}
          />
          <span className="mt-2 text-[10px] text-slate-400">
            {stempelMode === "draw"
              ? "Area kanvas transparan resolusi tinggi (mendukung sentuhan jari HP/tablet)."
              : "Hasil stempel transparan otomatis yang siap ditempelkan di dokumen & tanda tangan."}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md transition-all hover:shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan ke Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
