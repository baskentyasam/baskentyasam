import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import apiClient from "../api/axios";

interface OccupancyData {
  zoneName: string;
  count: number;
  capacity: number;
  occupancyRate: number;
  logTime: string | null;
}

const REFRESH_INTERVAL_MS = 5000;

/** Bölge slug'ı; backend `api/Occupancy/{zoneName}` ile uyumlu (veri yoksa API sıfır döner). */
const PARKING_ZONE = "otopark";

const ParkingOccupancyPage: React.FC = () => {
  const user = getCurrentUser();
  const isStudent = user?.role === "student";

  const [totalCapacity, setTotalCapacity] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("Veri bekleniyor...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeklyHourlyAverages = [
    { hour: "09:00", rate: 32 },
    { hour: "10:00", rate: 45 },
    { hour: "11:00", rate: 61 },
    { hour: "12:00", rate: 82 },
    { hour: "13:00", rate: 76 },
    { hour: "14:00", rate: 68 },
    { hour: "15:00", rate: 58 },
    { hour: "16:00", rate: 49 },
    { hour: "17:00", rate: 41 },
    { hour: "18:00", rate: 35 },
    { hour: "19:00", rate: 28 },
    { hour: "20:00", rate: 22 },
  ];

  const peakHour = weeklyHourlyAverages.reduce((max, item) =>
    item.rate > max.rate ? item : max
  );

  const fetchOccupancy = useCallback(async () => {
    try {
      const response = await apiClient.get<OccupancyData>(
        `/occupancy/${PARKING_ZONE}`
      );
      const data = response.data;

      setCurrentCount(data.count);
      setTotalCapacity(data.capacity);

      if (data.logTime) {
        const date = new Date(data.logTime);
        setLastUpdated(
          date.toLocaleDateString("tr-TR") +
            ", " +
            date.toLocaleTimeString("tr-TR")
        );
      } else {
        setLastUpdated("Henüz veri yok");
      }

      setError(null);
    } catch (err) {
      setError("Otopark doluluk verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const tick = async () => {
      await fetchOccupancy();
      if (cancelled) return;
      timeoutId = setTimeout(tick, REFRESH_INTERVAL_MS);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchOccupancy]);

  const occupancyRate = useMemo(() => {
    if (totalCapacity === 0) return 0;
    return Math.round((currentCount / totalCapacity) * 100);
  }, [currentCount, totalCapacity]);

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
    if (rate <= 40)
      return "Otopark şu anda uygun yoğunlukta; park yeri bulma ihtimali yüksek.";
    if (rate <= 70)
      return "Otopark orta yoğunlukta; alternatif zaman veya çıkış planı düşünün.";
    return "Otopark şu anda oldukça dolu ya da yakın dolulukta.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Otopark doluluğu yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-semibold">Otopark Doluluk Oranı</h1>
          <Link
            to={isStudent ? "/ogrenci" : "/ogretim-elemani"}
            className="text-sm underline hover:opacity-90"
          >
            {isStudent
              ? "Öğrenci anasayfasına dön"
              : "Öğretim elemanı anasayfasına dön"}
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

          <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 md:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Güncel Otopark Yoğunluğu
              </h2>
              <p className="text-slate-600 text-base">
                Kampüs otoparkının anlık doluluk durumu aşağıda gösterilmektedir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500 mb-2">
                  Toplam park yeri kapasitesi
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {totalCapacity}
                </p>
                <p className="text-sm text-slate-600 mt-1">araç</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500 mb-2">
                  Dolu park yeri sayısı
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {currentCount}
                </p>
                <p className="text-sm text-slate-600 mt-1">araç</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500 mb-2">Doluluk oranı</p>
                <p
                  className={`text-3xl font-bold ${getTextColor(occupancyRate)}`}
                >
                  %{occupancyRate}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {getStatusText(occupancyRate)}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">
                  Anlık doluluk seviyesi
                </span>
                <span
                  className={`text-sm font-semibold ${getTextColor(occupancyRate)}`}
                >
                  %{occupancyRate}
                </span>
              </div>

              <div className="w-full h-6 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getBarColor(
                    occupancyRate
                  )}`}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Son 7 Günün Saatlik Yoğunluğu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Saatlere göre ortalama otopark doluluk oranı
                  </p>
                </div>

                <span className="text-xs font-semibold text-red-600">
                  En yoğun: {peakHour.hour}
                </span>
              </div>

              <svg viewBox="0 0 520 190" className="w-full h-56">
                {[0, 25, 50, 75, 100].map((y) => (
                  <g key={y}>
                    <line
                      x1="40"
                      x2="500"
                      y1={160 - y * 1.3}
                      y2={160 - y * 1.3}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x="8"
                      y={164 - y * 1.3}
                      fontSize="10"
                      fill="#64748b"
                    >
                      %{y}
                    </text>
                  </g>
                ))}

                <polyline
                  fill="none"
                  stroke="#d71920"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={weeklyHourlyAverages
                    .map((item, index) => {
                      const x =
                        40 +
                        index * (460 / (weeklyHourlyAverages.length - 1));
                      const y = 160 - item.rate * 1.3;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />

                {weeklyHourlyAverages.map((item, index) => {
                  const x =
                    40 + index * (460 / (weeklyHourlyAverages.length - 1));
                  const y = 160 - item.rate * 1.3;
                  const isPeak = item.hour === peakHour.hour;

                  return (
                    <g key={item.hour}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isPeak ? "6" : "4"}
                        fill={isPeak ? "#991b1b" : "#d71920"}
                      />
                      {isPeak && (
                        <text
                          x={x}
                          y={y - 10}
                          fontSize="10"
                          textAnchor="middle"
                          fill="#991b1b"
                          fontWeight="700"
                        >
                          %{item.rate}
                        </text>
                      )}
                      <text
                        x={x}
                        y="180"
                        fontSize="9"
                        textAnchor="middle"
                        fill="#475569"
                      >
                        {item.hour}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                <p>
                  Son 7 güne göre otoparkta en yoğun saat:{" "}
                  <span className="font-semibold text-slate-900">
                    {peakHour.hour} (%{peakHour.rate})
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Bu grafik son 1 haftanın saatlik ortalama otopark doluluğuna göre
                  hazırlanmıştır.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
              <p className="text-base text-slate-800 leading-7">
                Otopark toplam{" "}
                <span className="font-semibold">
                  {totalCapacity} araçlık
                </span>{" "}
                kapasiteye sahip; şu anda{" "}
                <span className="font-semibold">{currentCount} araç</span> park
                halinde. Buna göre doluluk oranı{" "}
                <span className={`font-bold ${getTextColor(occupancyRate)}`}>
                  %{occupancyRate}
                </span>{" "}
                düzeyindedir.
              </p>
            </div>

            <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-800">
                  Son güncelleme:
                </span>{" "}
                {lastUpdated}
              </p>
              <p>
                Veriler otopark doluluk durumuna göre otomatik olarak
                güncellenmektedir.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ParkingOccupancyPage;
