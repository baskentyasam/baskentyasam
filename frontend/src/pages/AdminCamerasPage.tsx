import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import {
  DeviceListItem,
  LocationType,
  deviceService,
  CreateDeviceInput,
} from "../services/deviceService";

const LOCATION_LABELS: Record<LocationType, string> = {
  library: "Kütüphane",
  parking: "Otopark",
  cafeteria: "Kafeterya",
};

const AdminCamerasPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateDeviceInput>({
    id: "",
    name: "",
    locationType: "library",
    locationKey: "",
  });
  const [newToken, setNewToken] = useState<{ deviceId: string; token: string } | null>(null);

  const load = async () => {
    try {
      setError("");
      const list = await deviceService.list();
      setDevices(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Cihazlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // 15 sn'de bir liste yenile (online durumu)
    return () => clearInterval(t);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const result = await deviceService.create({
        ...form,
        locationKey: form.locationKey?.trim() || null,
      });
      setNewToken({ deviceId: result.device.id, token: result.plainToken });
      setForm({ id: "", name: "", locationType: "library", locationKey: "" });
      setFormOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Cihaz oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout title="Kameralar" subtitle="Doluluk takip cihazları">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {newToken && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="font-semibold text-amber-900">
              Yeni cihaz oluşturuldu: {newToken.deviceId}
            </div>
            <div className="mt-2 text-sm text-amber-800">
              Aşağıdaki token'ı Pi'a kopyala. <b>Bu token yalnızca bir kez gösterilir.</b>
            </div>
            <code className="mt-2 block break-all rounded bg-white p-3 font-mono text-sm">
              {newToken.token}
            </code>
            <button
              className="mt-3 rounded bg-amber-700 px-3 py-1 text-sm text-white hover:bg-amber-800"
              onClick={() => setNewToken(null)}
            >
              Anladım, kapat
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-lg bg-[#d71920] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01519]"
          >
            {formOpen ? "İptal" : "+ Yeni Cihaz"}
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">Cihaz ID</label>
              <input
                type="text"
                required
                pattern="[a-z0-9-]+"
                placeholder="library-main"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                className="mt-1 w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-[#d71920] focus:ring-[#d71920]"
              />
              <p className="mt-1 text-xs text-slate-500">küçük harf, rakam ve - kullan</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Görünen Ad</label>
              <input
                type="text"
                required
                placeholder="Kütüphane Ana Giriş"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-[#d71920] focus:ring-[#d71920]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Lokasyon Tipi</label>
              <select
                value={form.locationType}
                onChange={(e) =>
                  setForm({ ...form, locationType: e.target.value as LocationType })
                }
                className="mt-1 w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-[#d71920] focus:ring-[#d71920]"
              >
                <option value="library">Kütüphane</option>
                <option value="parking">Otopark</option>
                <option value="cafeteria">Kafeterya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Lokasyon Anahtarı (opsiyonel)
              </label>
              <input
                type="text"
                placeholder="library-main, parking-1, vs."
                value={form.locationKey ?? ""}
                onChange={(e) => setForm({ ...form, locationKey: e.target.value })}
                className="mt-1 w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-[#d71920] focus:ring-[#d71920]"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-[#d71920] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01519] disabled:opacity-50"
              >
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-slate-500">
            Cihazlar yükleniyor...
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Henüz kayıtlı cihaz yok. Yukarıdaki "+ Yeni Cihaz" ile bir tane oluştur.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((d) => (
              <Link
                key={d.id}
                to={`/admin/cameras/${encodeURIComponent(d.id)}`}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#d71920] hover:shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{d.name}</h3>
                    <p className="text-xs text-slate-500">{d.id}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      d.isOnline
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {d.isOnline ? "● Çevrimiçi" : "○ Çevrimdışı"}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div>
                    <span className="text-slate-500">Lokasyon:</span>{" "}
                    {LOCATION_LABELS[d.locationType] ?? d.locationType}
                  </div>
                  <div>
                    <span className="text-slate-500">Config v:</span> {d.configVersion}
                  </div>
                  <div>
                    <span className="text-slate-500">Son görülme:</span>{" "}
                    {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("tr-TR") : "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCamerasPage;
