import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import {
  ActiveParkingLot,
  getActiveParkingLots,
  getAvailableSlots,
  getOccupancyRate,
} from "../services/parkingService";

const SELECTED_PARKING_STORAGE_KEY = "parking_selected_id";

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
  if (rate <= 40) return "Otopark şu anda uygun yoğunlukta.";
  if (rate <= 70) return "Otopark orta yoğunlukta.";
  return "Otopark şu anda oldukça yoğun.";
};

const ParkingOccupancyPage: React.FC = () => {
  const user = getCurrentUser();
  const isStudent = user?.role === "student";
  const homePath = isStudent ? "/ogrenci" : "/ogretim-elemani";

  const [lots, setLots] = useState<ActiveParkingLot[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedLot, setSelectedLot] = useState<ActiveParkingLot | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadLots = useCallback(async (keepSelection = true) => {
    setListLoading(true);
    setListError("");
    try {
      const data = await getActiveParkingLots();
      setLots(data);
      setLastUpdated(new Date().toLocaleString("tr-TR"));

      if (keepSelection && selectedLot) {
        const refreshed = data.find((p) => p.id === selectedLot.id);
        if (refreshed) {
          setSelectedLot(refreshed);
          sessionStorage.setItem(SELECTED_PARKING_STORAGE_KEY, String(refreshed.id));
        } else {
          setSelectedLot(null);
          sessionStorage.removeItem(SELECTED_PARKING_STORAGE_KEY);
        }
      } else if (!keepSelection) {
        setSelectedLot(null);
        sessionStorage.removeItem(SELECTED_PARKING_STORAGE_KEY);
      }
    } catch {
      setListError("Otopark listesi alınamadı.");
      setLots([]);
    } finally {
      setListLoading(false);
    }
  }, [selectedLot]);

  useEffect(() => {
    const init = async () => {
      setListLoading(true);
      setListError("");
      try {
        const data = await getActiveParkingLots();
        setLots(data);
        setLastUpdated(new Date().toLocaleString("tr-TR"));

        const savedId = sessionStorage.getItem(SELECTED_PARKING_STORAGE_KEY);
        if (savedId) {
          const lot = data.find((p) => p.id === Number(savedId));
          if (lot) setSelectedLot(lot);
        }
      } catch {
        setListError("Otopark listesi alınamadı.");
      } finally {
        setListLoading(false);
      }
    };
    void init();
  }, []);

  const selectLot = (lot: ActiveParkingLot | null) => {
    if (lot) {
      sessionStorage.setItem(SELECTED_PARKING_STORAGE_KEY, String(lot.id));
      setSelectedLot(lot);
    } else {
      sessionStorage.removeItem(SELECTED_PARKING_STORAGE_KEY);
      setSelectedLot(null);
    }
  };

  const occupancyRate = useMemo(
    () => (selectedLot ? getOccupancyRate(selectedLot) : 0),
    [selectedLot],
  );

  const availableSlots = useMemo(
    () => (selectedLot ? getAvailableSlots(selectedLot) : 0),
    [selectedLot],
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-semibold">Otopark Doluluk</h1>
          <Link to={homePath} className="text-sm underline hover:opacity-90">
            {isStudent ? "Öğrenci anasayfasına dön" : "Öğretim elemanı anasayfasına dön"}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {listLoading && !selectedLot && (
            <div className="bg-white rounded-2xl border p-8 text-center text-slate-500">
              Otoparklar yükleniyor…
            </div>
          )}

          {listError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
              {listError}
            </div>
          )}

          {!listLoading && !listError && lots.length === 0 && (
            <div className="bg-white rounded-2xl border p-8 text-center text-slate-500">
              Aktif otopark bulunamadı.
            </div>
          )}

          {!selectedLot && !listLoading && lots.length > 0 && (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Otopark Seçin</h2>
              <p className="text-sm text-slate-600 mb-6">
                Doluluk bilgisini görmek istediğiniz otoparkı seçin.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lots.map((lot) => {
                  const rate = getOccupancyRate(lot);
                  const available = getAvailableSlots(lot);
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => selectLot(lot)}
                      className="text-left rounded-2xl border border-slate-200 p-5 hover:border-[#d71920] hover:bg-red-50 transition"
                    >
                      <h3 className="text-lg font-semibold text-slate-900">{lot.name}</h3>
                      {lot.location && (
                        <p className="text-sm text-slate-600 mt-1">{lot.location}</p>
                      )}
                      <p className={`text-sm font-medium mt-3 ${getTextColor(rate)}`}>
                        %{rate} dolu · {available} boş yer
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedLot && (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 md:p-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Seçili otopark</p>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedLot.name}</h2>
                  {selectedLot.location && (
                    <p className="text-sm text-slate-600 mt-1">{selectedLot.location}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="parking-switch" className="text-sm text-slate-600 whitespace-nowrap">
                    Otopark değiştir
                  </label>
                  <select
                    id="parking-switch"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
                    value={selectedLot.id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id === 0) {
                        selectLot(null);
                        return;
                      }
                      const lot = lots.find((p) => p.id === id);
                      if (lot) selectLot(lot);
                    }}
                  >
                    <option value={0}>Otopark listesine dön</option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void loadLots(true)}
                    disabled={listLoading}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    Yenile
                  </button>
                </div>
              </div>

              {listError ? (
                <p className="text-red-600">Seçilen otopark bilgisi alınamadı.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">Kapasite</p>
                      <p className="text-3xl font-bold text-slate-900">{selectedLot.capacity}</p>
                      <p className="text-sm text-slate-600 mt-1">araç</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">Mevcut doluluk</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {selectedLot.currentOccupancy}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">araç</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500 mb-2">Boş yer</p>
                      <p className="text-3xl font-bold text-slate-900">{availableSlots}</p>
                      <p className={`text-sm mt-1 font-medium ${getTextColor(occupancyRate)}`}>
                        %{occupancyRate} doluluk · {getStatusText(occupancyRate)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">
                        Anlık doluluk seviyesi
                      </span>
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

                  <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
                    <p className="text-base text-slate-800 leading-7">
                      <span className="font-semibold">{selectedLot.name}</span> otoparkının kapasitesi{" "}
                      <span className="font-semibold">{selectedLot.capacity} araç</span>, şu anda{" "}
                      <span className="font-semibold">{selectedLot.currentOccupancy} araç</span>{" "}
                      dolu. Boş yer:{" "}
                      <span className="font-semibold">{availableSlots}</span>. Doluluk oranı:{" "}
                      <span className={`font-bold ${getTextColor(occupancyRate)}`}>
                        %{occupancyRate}
                      </span>
                      .
                    </p>
                  </div>

                  {lastUpdated && (
                    <p className="mt-6 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">Son güncelleme:</span>{" "}
                      {lastUpdated}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ParkingOccupancyPage;
