import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  LibraryAdminOverview,
  getLibraryAdminOverview,
  updateLibraryCapacities,
  updateLibraryOccupancy,
  updateLibraryOpenFloors,
} from "../services/adminService";

type FloorDraft = {
  code: string;
  name: string;
  maxCapacity: number;
  isOpen: boolean;
};

const PRESETS: { label: string; codes: string[] }[] = [
  { label: "Tüm katlar", codes: ["minus1", "ground", "floor1", "floor2", "h24"] },
  { label: "17:00 sonrası (Giriş + 7/24)", codes: ["ground", "h24"] },
  { label: "22:00 sonrası (Sadece 7/24)", codes: ["h24"] },
];

const AdminLibraryPage: React.FC = () => {
  const [overview, setOverview] = useState<LibraryAdminOverview | null>(null);
  const [floorsDraft, setFloorsDraft] = useState<FloorDraft[]>([]);
  const [occupancyInput, setOccupancyInput] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [savingCapacities, setSavingCapacities] = useState(false);
  const [savingOccupancy, setSavingOccupancy] = useState(false);

  const load = async () => {
    const data = await getLibraryAdminOverview();
    setOverview(data);
    setFloorsDraft(
      data.floors.map((f) => ({
        code: f.code,
        name: f.name,
        maxCapacity: f.maxCapacity,
        isOpen: f.isOpen,
      })),
    );
    setOccupancyInput(data.currentOccupancy);
  };

  useEffect(() => {
    load().catch(() => setError("Kütüphane verisi yüklenemedi."));
  }, []);

  const draftOpenCapacity = useMemo(
    () => floorsDraft.filter((f) => f.isOpen).reduce((sum, f) => sum + f.maxCapacity, 0),
    [floorsDraft],
  );

  const draftRate = useMemo(() => {
    if (draftOpenCapacity <= 0) return 0;
    return Math.min(100, Math.round((occupancyInput / draftOpenCapacity) * 100));
  }, [occupancyInput, draftOpenCapacity]);

  const applyPreset = (codes: string[]) => {
    const set = new Set(codes);
    setFloorsDraft((prev) =>
      prev.map((f) => ({
        ...f,
        isOpen: set.has(f.code),
      })),
    );
    setSuccess("");
    setError("");
  };

  const handleSaveOpenFloors = async () => {
    setSavingOpen(true);
    setError("");
    setSuccess("");
    try {
      const openFloorCodes = floorsDraft.filter((f) => f.isOpen).map((f) => f.code);
      const data = await updateLibraryOpenFloors(openFloorCodes);
      setOverview(data);
      setFloorsDraft(
        data.floors.map((f) => ({
          code: f.code,
          name: f.name,
          maxCapacity: f.maxCapacity,
          isOpen: f.isOpen,
        })),
      );
      setSuccess("Açık katlar güncellendi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Açık katlar kaydedilemedi.");
    } finally {
      setSavingOpen(false);
    }
  };

  const handleSaveCapacities = async () => {
    setSavingCapacities(true);
    setError("");
    setSuccess("");
    try {
      const data = await updateLibraryCapacities(
        floorsDraft.map((f) => ({ code: f.code, maxCapacity: f.maxCapacity })),
      );
      setOverview(data);
      setFloorsDraft(
        data.floors.map((f) => ({
          code: f.code,
          name: f.name,
          maxCapacity: f.maxCapacity,
          isOpen: f.isOpen,
        })),
      );
      setSuccess("Kat kapasiteleri güncellendi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kapasiteler kaydedilemedi.");
    } finally {
      setSavingCapacities(false);
    }
  };

  const handleSaveOccupancy = async () => {
    setSavingOccupancy(true);
    setError("");
    setSuccess("");
    try {
      const data = await updateLibraryOccupancy(occupancyInput);
      setOverview(data);
      setOccupancyInput(data.currentOccupancy);
      setSuccess("Anlık doluluk güncellendi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Doluluk kaydedilemedi.");
    } finally {
      setSavingOccupancy(false);
    }
  };

  if (!overview) {
    return (
      <AdminLayout title="Kütüphane Yönetimi">
        <div className="admin-card admin-card-body text-slate-500">Yükleniyor...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Kütüphane Yönetimi"
      subtitle="Açık katları, kapasiteleri ve anlık doluluk verisini buradan yönetebilirsiniz."
    >
      {error && <div className="admin-card admin-card-body mb-6 text-sm text-red-600">{error}</div>}
      {success && (
        <div className="admin-card admin-card-body mb-6 text-sm text-green-700">{success}</div>
      )}

      <section className="admin-card admin-card-body mb-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Anlık Özet</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
            <div className="text-2xl font-semibold text-slate-900">{draftOpenCapacity}</div>
            <div className="mt-1 text-sm text-slate-500">Açık kapasite</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
            <div className="text-2xl font-semibold text-slate-900">{occupancyInput}</div>
            <div className="mt-1 text-sm text-slate-500">İçerideki kişi</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
            <div className="text-2xl font-semibold text-slate-900">
              {Math.max(draftOpenCapacity - occupancyInput, 0)}
            </div>
            <div className="mt-1 text-sm text-slate-500">Boş yer</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
            <div className="text-2xl font-semibold text-[#d71920]">%{draftRate}</div>
            <div className="mt-1 text-sm text-slate-500">Doluluk oranı</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card admin-card-body">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Açık Olan Katlar</h2>
          <p className="mb-4 text-sm text-slate-600">
            Doluluk yüzdesi yalnızca işaretli katların kapasite toplamına göre hesaplanır.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="admin-btn-outline-gray text-xs"
                onClick={() => applyPreset(preset.codes)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-5">
            {floorsDraft.map((floor) => (
              <label
                key={floor.code}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-900">{floor.name}</span>
                  <span className="ml-2 text-xs text-slate-500">Kapasite: {floor.maxCapacity}</span>
                </div>
                <input
                  type="checkbox"
                  checked={floor.isOpen}
                  onChange={(e) =>
                    setFloorsDraft((prev) =>
                      prev.map((f) =>
                        f.code === floor.code ? { ...f, isOpen: e.target.checked } : f,
                      ),
                    )
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            className="admin-btn-primary w-full"
            disabled={savingOpen}
            onClick={() => void handleSaveOpenFloors()}
          >
            {savingOpen ? "Kaydediliyor..." : "Açık Katları Kaydet"}
          </button>
        </section>

        <section className="admin-card admin-card-body">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Kat Kapasiteleri</h2>
          <p className="mb-4 text-sm text-slate-600">Her katın maksimum kişi kapasitesini güncelleyin.</p>

          <div className="space-y-3 mb-5">
            {floorsDraft.map((floor) => (
              <div key={floor.code} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{floor.name}</span>
                <input
                  className="admin-input w-28"
                  type="number"
                  min={0}
                  value={floor.maxCapacity}
                  onChange={(e) =>
                    setFloorsDraft((prev) =>
                      prev.map((f) =>
                        f.code === floor.code
                          ? { ...f, maxCapacity: Number(e.target.value) }
                          : f,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="admin-btn-secondary w-full"
            disabled={savingCapacities}
            onClick={() => void handleSaveCapacities()}
          >
            {savingCapacities ? "Kaydediliyor..." : "Kapasiteleri Kaydet"}
          </button>
        </section>
      </div>

      <section className="admin-card admin-card-body mt-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Anlık Doluluk (Kamera / Manuel)</h2>
        <p className="mb-4 text-sm text-slate-600">
          Giriş-çıkış sayımından gelen toplam kişi sayısını girin. Kamera entegrasyonu bu alanı otomatik
          güncelleyecektir.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="admin-label">İçerideki kişi sayısı</label>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={occupancyInput}
              onChange={(e) => setOccupancyInput(Number(e.target.value))}
            />
          </div>
          <button
            type="button"
            className="admin-btn-primary sm:w-auto w-full"
            disabled={savingOccupancy}
            onClick={() => void handleSaveOccupancy()}
          >
            {savingOccupancy ? "Kaydediliyor..." : "Doluluk Güncelle"}
          </button>
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminLibraryPage;
