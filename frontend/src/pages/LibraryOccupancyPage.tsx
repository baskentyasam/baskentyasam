import React, { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import OccupancyCharts from "../components/OccupancyCharts";
import { useLiveOccupancyFeed } from "../hooks/useLiveOccupancyFeed";
import { getCurrentUser } from "../services/authService";
import {
  LibraryOccupancySnapshot,
  getLibraryOccupancy,
  getAvailableSlots,
  getOccupancyRate,
  getOpenFloors,
} from "../services/libraryService";
import { trackOccupancyHistory } from "../utils/occupancyHistory";

const LibraryOccupancyPage: React.FC = () => {
  const user = getCurrentUser();
  const isStudent = user?.role === "student";

  const loadSnapshot = useCallback(() => getLibraryOccupancy(), []);
  const serializeSnapshot = useCallback(
    (snapshot: LibraryOccupancySnapshot) =>
      JSON.stringify([
        snapshot.currentOccupancy,
        snapshot.openCapacity,
        snapshot.floors.map((f) => [f.code, f.isOpen, f.maxCapacity]),
      ]),
    [],
  );

  const { data: snapshot, loading, error, lastUpdated } = useLiveOccupancyFeed(
    loadSnapshot,
    serializeSnapshot,
  );

  const data = snapshot ?? null;
  const openFloors = data ? getOpenFloors(data) : [];
  const closedFloors = data ? data.floors.filter((f) => !f.isOpen) : [];
  const totalCapacity = data?.openCapacity ?? 0;
  const currentCount = data?.currentOccupancy ?? 0;
  const availableSlots = data ? getAvailableSlots(data) : 0;
  const occupancyRate = data ? getOccupancyRate(data) : 0;

  const hourlyData = useMemo(() => {
    if (!data) return [];
    return trackOccupancyHistory("library-occupancy", occupancyRate);
  }, [data, occupancyRate]);

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
    if (rate <= 40) return "Kütüphane şu anda uygun yoğunlukta.";
    if (rate <= 70) return "Kütüphane orta yoğunlukta.";
    return "Kütüphane şu anda oldukça yoğun.";
  };

  if (loading && !data) {
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

          {!data ? (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-10 text-center text-slate-600">
              Şu anda görüntülenecek kütüphane doluluk verisi bulunmuyor.
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 md:p-10">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Güncel Kütüphane Yoğunluğu</h2>
                <p className="text-slate-600 text-base">
                  Doluluk oranı, o an açık olan katların toplam kapasitesine göre hesaplanır.
                </p>
                {data.scheduleDescription && (
                  <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {data.scheduleDescription}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500 mb-2">Açık Kapasite</p>
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

              <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Şu An Açık Katlar</h3>
                {openFloors.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    Şu anda ziyaretçilere açık kat bulunmuyor.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {openFloors.map((floor) => (
                      <span
                        key={floor.code}
                        className="inline-flex items-center rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 border border-green-200"
                      >
                        {floor.name}
                        <span className="ml-2 text-green-700/80">({floor.maxCapacity} kişi)</span>
                      </span>
                    ))}
                  </div>
                )}

                {closedFloors.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                      Kapalı katlar
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {closedFloors.map((floor) => (
                        <span
                          key={floor.code}
                          className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {floor.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

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

              <OccupancyCharts
                title="Kütüphane"
                hourly={hourlyData}
                compareItems={[]}
              />

              <div className="rounded-2xl bg-red-50 border border-red-100 p-5 mb-6 mt-6">
                <p className="text-base text-slate-800 leading-7">
                  Açık katların toplam kapasitesi{" "}
                  <span className="font-semibold">{totalCapacity} kişi</span>, şu anda içeride{" "}
                  <span className="font-semibold">{currentCount} kişi</span> bulunuyor (
                  <span className="font-semibold">{availableSlots} boş yer</span>). Doluluk oranı{" "}
                  <span className={`font-bold ${getTextColor(occupancyRate)}`}>%{occupancyRate}</span>.
                  {openFloors.length > 0 && (
                    <>
                      {" "}
                      Açık katlar:{" "}
                      <span className="font-semibold">
                        {openFloors.map((f) => f.name).join(", ")}
                      </span>.
                    </>
                  )}
                </p>
              </div>

              <div className="mt-6 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Son güncelleme:</span> {lastUpdated}
                </p>
                <p className="mt-1">Veriler yalnızca değiştiğinde ekranda güncellenir.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LibraryOccupancyPage;
