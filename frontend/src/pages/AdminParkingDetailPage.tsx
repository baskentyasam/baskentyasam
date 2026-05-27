import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { getCurrentUser } from "../services/authService";
import { getParkingLotDetail, updateParkingLot, updateParkingMetrics } from "../services/adminService";

const AdminParkingDetailPage: React.FC = () => {
  const { parkingLotId } = useParams();
  const id = Number(parkingLotId);
  const user = getCurrentUser();
  const isSuperAdmin = user?.role === "superadmin";

  const [detail, setDetail] = useState<any>(null);
  const [occupancyInput, setOccupancyInput] = useState(0);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await getParkingLotDetail(id);
    setDetail(data);
    setOccupancyInput(data.currentOccupancy);
  };

  useEffect(() => {
    load().catch((err: any) => {
      if (err?.response?.status === 403) setError("Bu otoparkı yönetme yetkiniz yok.");
      else setError("Otopark detayları yüklenemedi.");
    });
  }, [id]);

  if (error) {
    return (
      <AdminLayout title="Otopark Detayı">
        <div className="admin-card admin-card-body text-red-600">{error}</div>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout title="Otopark Detayı">
        <div className="admin-card admin-card-body text-slate-500">Yükleniyor...</div>
      </AdminLayout>
    );
  }

  const available = Math.max(detail.capacity - detail.currentOccupancy, 0);
  const occupancyRate = detail.capacity > 0 ? Math.round((detail.currentOccupancy / detail.capacity) * 100) : 0;

  return (
    <AdminLayout title={detail.name}>
      <Link to="/admin/parking" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        ← Otoparklar
      </Link>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-red-500">📍</span>
        <span className="text-sm text-slate-600">{detail.location || "Konum belirtilmemiş"}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card admin-card-body">
          <h3 className="mb-5 text-base font-semibold text-slate-900">Güncel Durum</h3>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
              <div className="text-2xl font-semibold text-slate-900">{detail.capacity}</div>
              <div className="mt-1 text-sm text-slate-500">Kapasite</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
              <div className="text-2xl font-semibold text-slate-900">{detail.currentOccupancy}</div>
              <div className="mt-1 text-sm text-slate-500">Dolu</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-5 text-center">
              <div className="text-2xl font-semibold text-slate-900">{available}</div>
              <div className="mt-1 text-sm text-slate-500">Boş</div>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Doluluk</span>
            <span>%{occupancyRate}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${occupancyRate}%` }} />
          </div>
        </section>

        <section className="admin-card admin-card-body">
          <h3 className="mb-5 text-base font-semibold text-slate-900">Doluluk Güncelle</h3>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await updateParkingMetrics(id, {
                capacity: detail.capacity,
                currentOccupancy: occupancyInput,
              });
              await load();
            }}
          >
            <div>
              <label className="admin-label">Mevcut Araç Sayısı (maks. {detail.capacity})</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                max={detail.capacity}
                value={occupancyInput}
                onChange={(e) => setOccupancyInput(Number(e.target.value))}
                required
              />
            </div>
            <button type="submit" className="admin-btn-primary w-full">
              Doluluk Güncelle
            </button>
          </form>
        </section>
      </div>

      {isSuperAdmin && (
        <section className="admin-card admin-card-body mt-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Meta Bilgi (Sadece Sistem Yöneticisi)</h3>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await updateParkingLot(id, {
                name: (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value,
                location: (e.currentTarget.elements.namedItem("location") as HTMLInputElement).value,
                capacity: Number((e.currentTarget.elements.namedItem("metaCapacity") as HTMLInputElement).value),
                currentOccupancy: Number((e.currentTarget.elements.namedItem("metaCurrentOccupancy") as HTMLInputElement).value),
                isActive: (e.currentTarget.elements.namedItem("isActive") as HTMLInputElement).checked,
              });
              await load();
            }}
          >
            <div>
              <label className="admin-label">Ad</label>
              <input name="name" className="admin-input" defaultValue={detail.name} required />
            </div>
            <div>
              <label className="admin-label">Konum</label>
              <input name="location" className="admin-input" defaultValue={detail.location || ""} />
            </div>
            <div>
              <label className="admin-label">Kapasite</label>
              <input name="metaCapacity" className="admin-input" defaultValue={detail.capacity} type="number" required />
            </div>
            <div>
              <label className="admin-label">Mevcut Doluluk</label>
              <input
                name="metaCurrentOccupancy"
                className="admin-input"
                defaultValue={detail.currentOccupancy}
                type="number"
                required
              />
            </div>
            <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
              <input name="isActive" type="checkbox" defaultChecked={detail.isActive} />
              Aktif
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="admin-btn-secondary">
                Meta Güncelle
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card admin-card-body mt-6 text-sm text-slate-500">
        Doluluk logları sonraki aşamada detaylandırılacak.
      </section>
    </AdminLayout>
  );
};

export default AdminParkingDetailPage;
