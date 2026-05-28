import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import {
  ActiveLibraryArea,
  getActiveLibraryAreas,
  getAvailableSlots,
  getOccupancyRate,
} from "../services/libraryService";

const REFRESH_INTERVAL_MS = 15000;

const LibraryOccupancyPage: React.FC = () => {
  const user = getCurrentUser();
  const isStudent = user?.role === "student";

  const [areas, setAreas] = useState<ActiveLibraryArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Veri bekleniyor...");

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) ?? null,
    [areas, selectedAreaId],
  );

  const loadAreas = useCallback(async () => {
    try {
      const data = await getActiveLibraryAreas();
      setAreas(data);
      setSelectedAreaId((prev) => {
        if (prev !== "" && data.some((a) => a.id === prev)) return prev;
        return data.length > 0 ? data[0].id : "";
      });
      setLastUpdated(
        new Date().toLocaleDateString("tr-TR") +
          ", " +
          new Date().toLocaleTimeString("tr-TR"),
      );
      setError(null);
    } catch {
      setError("Kütüphane alanları yüklenemedi.");
      setAreas([]);
      setSelectedAreaId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const tick = async () => {
      await loadAreas();
      if (cancelled) return;
      timeoutId = setTimeout(tick, REFRESH_INTERVAL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadAreas]);

  const totalCapacity = selectedArea?.capacity ?? 0;
  const currentCount = selectedArea?.currentOccupancy ?? 0;
  const availableSlots = selectedArea ? getAvailableSlots(selectedArea) : 0;
  const occupancyRate = selectedArea ? getOccupancyRate(selectedArea) : 0;

  const getBarColor = (rate: number) => {
    if (rate <= 40) return "bg-green-500";
    if (rate <= 70) return "bg-orange-400";
    return "bg-red-500";
  };

  const getTextColor = (rate: number) => {
    if (rate <= 40) return "text-green-600";
    if (rate <= 70) return "text-orange-500";
    return "text-red-600";
  };

  const getStatusText = (rate: number) => {
    if (rate <= 40) return "Bu alan şu anda uygun yoğunlukta.";
    if (rate <= 70) return "Bu alan orta yoğunlukta.";
    return "Bu alan şu anda oldukça yoğun.";
  };

  if (loading && areas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Doluluk verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-semibold">Kütüphane Doluluk Oranı</h1>
          <Link
            to={isStudent ? "/ogrenci" : "/ogretim-elemani"}
            className="text-sm underline hover:opacity-90"
          >
            {isStudent ? "Öğrenci anasayfasına dön" : "Öğretim elemanı anasayfasına dön"}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {areas.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-10 text-center text-slate-600">
              Şu anda görüntülenecek aktif kütüphane alanı bulunmuyor.
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 md:p-10">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Güncel Kütüphane Yoğunluğu</h2>
                <p className="text-slate-600 text-base">
                  Çalışma alanını seçerek anlık doluluk bilgisini görüntüleyebilirsiniz.
                </p>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Çalışma Alanı</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                  value={selectedAreaId === "" ? "" : String(selectedAreaId)}
                  onChange={(e) =>
                    setSelectedAreaId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.location ? ` — ${a.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedArea && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">Kapasite</p>
                      <p className="text-3xl font-bold text-slate-900">{totalCapacity}</p>
                      <p className="text-sm text-slate-600 mt-1">kişi</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">İçerideki Kişi</p>
                      <p className="text-3xl font-bold text-slate-900">{currentCount}</p>
                      <p className="text-sm text-slate-600 mt-1">kişi</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">Boş Yer</p>
                      <p className="text-3xl font-bold text-slate-900">{availableSlots}</p>
                      <p className="text-sm text-slate-600 mt-1">kişi</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">Doluluk Oranı</p>
                      <p className={`text-3xl font-bold ${getTextColor(occupancyRate)}`}>
                        %{occupancyRate}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{getStatusText(occupancyRate)}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">Anlık doluluk seviyesi</span>
                      <span className={`text-sm font-semibold ${getTextColor(occupancyRate)}`}>
                        %{occupancyRate}
                      </span>
                    </div>
                    <div className="w-full h-6 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getBarColor(occupancyRate)}`}
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-red-50 border border-red-100 p-5 mb-6">
                    <p className="text-base text-slate-800 leading-7">
                      <span className="font-semibold">{selectedArea.name}</span> alanında kapasite{" "}
                      <span className="font-semibold">{totalCapacity} kişi</span>, şu anda içeride{" "}
                      <span className="font-semibold">{currentCount} kişi</span> bulunuyor (
                      <span className="font-semibold">{availableSlots} boş yer</span>). Doluluk oranı{" "}
                      <span className={`font-bold ${getTextColor(occupancyRate)}`}>%{occupancyRate}</span>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-medium text-slate-700">Saatlik yoğunluk grafiği</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Gerçek zamanlı veri entegrasyonu sonraki aşamada eklenecektir.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">Son güncelleme:</span> {lastUpdated}
                    </p>
                    <p>Veriler her {REFRESH_INTERVAL_MS / 1000} saniyede bir yenilenir.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LibraryOccupancyPage;
