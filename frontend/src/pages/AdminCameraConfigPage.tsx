import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import {
  DeviceDetail,
  DeviceRoi,
  deviceService,
} from "../services/deviceService";

const FRAME_W = 854;
const FRAME_H = 480;
const HANDLE_RADIUS = 14;

type DragTarget = "start" | "end" | null;

const AdminCameraConfigPage: React.FC = () => {
  const { deviceId = "" } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [line, setLine] = useState<number[]>([427, 0, 427, 480]);
  const [mode, setMode] = useState<"person" | "vehicle">("person");
  const [flipDirection, setFlipDirection] = useState(false);
  const [roiEnabled, setRoiEnabled] = useState(false);
  const [roi, setRoi] = useState<DeviceRoi>({
    enabled: false,
    x: 0,
    y: 0,
    width: FRAME_W,
    height: FRAME_H,
  });

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapshotRequestedAt, setSnapshotRequestedAt] = useState<Date | null>(null);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragTarget>(null);

  const load = useCallback(async () => {
    if (!deviceId) return;
    try {
      setError("");
      const d = await deviceService.get(deviceId);
      setDetail(d);
      setLine(d.config.line);
      setMode(d.config.mode);
      setFlipDirection(d.config.flipDirection);
      const rr = d.config.roi;
      if (rr) {
        setRoi(rr);
        setRoiEnabled(rr.enabled);
      }
      setLastSnapshotAt(d.latestSnapshotAt ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Cihaz yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  // Snapshot poll: snapshot istendiğinde 10sn'de bir yeniden yükle (60sn boyunca)
  useEffect(() => {
    if (!snapshotRequestedAt) return;
    let cancelled = false;
    const start = Date.now();

    const tick = async () => {
      if (cancelled) return;
      const fresh = await deviceService.get(deviceId);
      if (cancelled) return;
      const newSnapAt = fresh.latestSnapshotAt;
      if (newSnapAt && (!lastSnapshotAt || newSnapAt !== lastSnapshotAt)) {
        const url = await deviceService.getSnapshotUrl(deviceId);
        if (url) {
          setSnapshotUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
        setLastSnapshotAt(newSnapAt);
        setSnapshotRequestedAt(null);
        return;
      }
      if (Date.now() - start > 60_000) {
        setSnapshotRequestedAt(null);
        setError("Pi 60 saniye içinde snapshot göndermedi. Pi çevrimiçi mi?");
        return;
      }
      setTimeout(tick, 5000);
    };
    setTimeout(tick, 5000);
    return () => {
      cancelled = true;
    };
  }, [snapshotRequestedAt, deviceId, lastSnapshotAt]);

  // İlk snapshot yükleme
  useEffect(() => {
    if (lastSnapshotAt && !snapshotUrl) {
      deviceService.getSnapshotUrl(deviceId).then((url) => {
        if (url) setSnapshotUrl(url);
      });
    }
    return () => {
      if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSnapshotAt, deviceId]);

  // Canvas çizimi
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = (rect.width * FRAME_H) / FRAME_W;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toCanvas = (x: number, y: number): [number, number] => [
      (x / FRAME_W) * canvas.width,
      (y / FRAME_H) * canvas.height,
    ];

    // ROI
    if (roiEnabled) {
      const [rx, ry] = toCanvas(roi.x, roi.y);
      const [rw, rh] = toCanvas(roi.width, roi.height);
      ctx.strokeStyle = "rgba(255,200,0,0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    // Çizgi
    const [cx1, cy1] = toCanvas(line[0], line[1]);
    const [cx2, cy2] = toCanvas(line[2], line[3]);

    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // IN/OUT etiketleri
    const dx = cx2 - cx1;
    const dy = cy2 - cy1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const px = -dy / len;
      const py = dx / len;
      const midX = (cx1 + cx2) / 2;
      const midY = (cy1 + cy2) / 2;
      const offset = 30;

      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const inX = midX + px * offset;
      const inY = midY + py * offset;
      const outX = midX - px * offset;
      const outY = midY - py * offset;

      if (!flipDirection) {
        ctx.fillStyle = "#00d26a";
        ctx.fillText("GİRİŞ", inX, inY);
        ctx.fillStyle = "#ff4466";
        ctx.fillText("ÇIKIŞ", outX, outY);
      } else {
        ctx.fillStyle = "#ff4466";
        ctx.fillText("ÇIKIŞ", inX, inY);
        ctx.fillStyle = "#00d26a";
        ctx.fillText("GİRİŞ", outX, outY);
      }
    }

    // Uç tutamaçları
    const drawHandle = (x: number, y: number, color: string) => {
      ctx.beginPath();
      ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    drawHandle(cx1, cy1, "#00d26a");
    drawHandle(cx2, cy2, "#ff4466");
  }, [line, flipDirection, roi, roiEnabled]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const toVideoCoords = (clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const vx = Math.round((mx / canvas.width) * FRAME_W);
    const vy = Math.round((my / canvas.height) * FRAME_H);
    return [
      Math.max(0, Math.min(FRAME_W, vx)),
      Math.max(0, Math.min(FRAME_H, vy)),
    ];
  };

  const hitTestHandle = (clientX: number, clientY: number): DragTarget => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const toCanvas = (x: number, y: number): [number, number] => [
      (x / FRAME_W) * canvas.width,
      (y / FRAME_H) * canvas.height,
    ];
    const [cx1, cy1] = toCanvas(line[0], line[1]);
    const [cx2, cy2] = toCanvas(line[2], line[3]);
    const d1 = Math.hypot(mx - cx1, my - cy1);
    const d2 = Math.hypot(mx - cx2, my - cy2);
    if (d1 < HANDLE_RADIUS * 1.5) return "start";
    if (d2 < HANDLE_RADIUS * 1.5) return "end";
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const hit = hitTestHandle(e.clientX, e.clientY);
    if (hit) {
      dragRef.current = hit;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const [vx, vy] = toVideoCoords(e.clientX, e.clientY);
    setLine((prev) => {
      const next = [...prev];
      if (dragRef.current === "start") {
        next[0] = vx;
        next[1] = vy;
      } else {
        next[2] = vx;
        next[3] = vy;
      }
      return next;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  };

  const handleRequestSnapshot = async () => {
    try {
      setError("");
      await deviceService.requestSnapshot(deviceId);
      setSnapshotRequestedAt(new Date());
      setSuccess("Snapshot istendi. Pi 10-30 sn içinde gönderecek.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Snapshot istenirken hata oluştu.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const cfg = await deviceService.updateConfig(deviceId, {
        line,
        mode,
        flipDirection,
        roi: roiEnabled
          ? { ...roi, enabled: true }
          : null,
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              device: { ...prev.device, configVersion: cfg.configVersion },
              config: cfg,
            }
          : prev,
      );
      setSuccess(`Config kaydedildi (v${cfg.configVersion}). Pi 10 sn içinde uygulayacak.`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Kamera Yapılandırma">
        <div className="rounded-lg bg-white p-6 text-center text-sm text-slate-500">
          Yükleniyor...
        </div>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout title="Kamera Yapılandırma">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Cihaz bulunamadı.
          <button
            onClick={() => navigate("/admin/cameras")}
            className="ml-2 underline"
          >
            Listeye dön
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={detail.device.name}
      subtitle={`Cihaz: ${detail.device.id} · v${detail.config.configVersion}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/admin/cameras")}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            ← Liste
          </button>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              detail.device.isOnline
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {detail.device.isOnline ? "● Çevrimiçi" : "○ Çevrimdışı"}
          </span>
          <span className="text-xs text-slate-500">
            Son görülme: {detail.device.lastSeenAt ? new Date(detail.device.lastSeenAt).toLocaleString("tr-TR") : "—"}
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-slate-900 p-2">
              <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
                {snapshotUrl ? (
                  <img
                    src={snapshotUrl}
                    alt="snapshot"
                    className="absolute inset-0 h-full w-full select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                    Henüz snapshot yok — "Snapshot Yenile" tıkla
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full touch-none"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={handleRequestSnapshot}
                disabled={snapshotRequestedAt !== null}
                className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {snapshotRequestedAt ? "Bekleniyor..." : "📷 Snapshot Yenile"}
              </button>
              <span className="text-xs text-slate-500">
                {lastSnapshotAt ? `Son: ${new Date(lastSnapshotAt).toLocaleString("tr-TR")}` : "Hiç snapshot yok"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700">Çizgi Koordinatları</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx}>
                    <label className="block text-xs text-slate-500">
                      {idx < 2 ? "Başlangıç" : "Bitiş"} {idx % 2 === 0 ? "X" : "Y"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={idx % 2 === 0 ? FRAME_W : FRAME_H}
                      value={line[idx]}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || "0", 10);
                        setLine((prev) => {
                          const next = [...prev];
                          next[idx] = Math.max(0, Math.min(idx % 2 === 0 ? FRAME_W : FRAME_H, v));
                          return next;
                        });
                      }}
                      className="mt-1 w-full rounded border-slate-300 px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700">Algılama</h3>
              <div className="mt-2 space-y-3">
                <div>
                  <label className="block text-xs text-slate-500">Mod</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "person" | "vehicle")}
                    className="mt-1 w-full rounded border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="person">Kişi</option>
                    <option value="vehicle">Araç</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={flipDirection}
                    onChange={(e) => setFlipDirection(e.target.checked)}
                  />
                  Yönü ters çevir (Giriş ↔ Çıkış)
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700">İlgi Alanı (ROI)</h3>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roiEnabled}
                  onChange={(e) => setRoiEnabled(e.target.checked)}
                />
                ROI'yi etkinleştir
              </label>
              {roiEnabled && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {(["x", "y", "width", "height"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs uppercase text-slate-500">{field}</label>
                      <input
                        type="number"
                        min={0}
                        value={roi[field]}
                        onChange={(e) => {
                          const v = parseInt(e.target.value || "0", 10);
                          setRoi((prev) => ({ ...prev, [field]: Math.max(0, v) }));
                        }}
                        className="mt-1 w-full rounded border-slate-300 px-2 py-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-[#d71920] py-3 text-sm font-semibold text-white hover:bg-[#b01519] disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <p className="text-xs text-slate-500">
              Kaydedince Pi 10 saniye içinde yeni konfigürasyonu çekecek.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCameraConfigPage;
