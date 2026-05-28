import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import {
  getAdminLibraryAreas,
  updateLibraryArea,
  updateLibraryMetrics,
} from "../services/adminService";

const AdminLibraryDetailPage: React.FC = () => {
  const { libraryAreaId } = useParams();
  const id = Number(libraryAreaId);

  const [detail, setDetail] = useState<any>(null);
  const [occupancyInput, setOccupancyInput] = useState(0);
  const [capacityInput, setCapacityInput] = useState(0);
  const [error, setError] = useState("");

  const load = async () => {
    const list = await getAdminLibraryAreas();
    const data = list.find((a) => a.id === id);
    if (!data) {
      throw new Error("notfound");
    }
    setDetail(data);
    setOccupancyInput(data.currentOccupancy);
    setCapacityInput(data.capacity);
  };

  useEffect(() => {
    load().catch(() => setError("Kütüphane alanı bulunamadı veya yüklenemedi."));
  }, [id]);

  if (error) {
    return (
      <AdminLayout title="Kütüphane Alanı">
        <Link to="/admin/library" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Kütüphane Alanları
        </Link>
        <div className="admin-card admin-card-body text-red-600">{error}</div>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout title="Kütüphane Alanı">
        <div className="admin-card admin-card-body text-slate-500">Yükleniyor...</div>
      </AdminLayout>
    );
  }

  const available = Math.max(detail.capacity - detail.currentOccupancy, 0);
  const occupancyRate = detail.capacity > 0 ? Math.round((detail.currentOccupancy / detail.capacity) * 100) : 0;

  return (
    <AdminLayout title={detail.name}>
      <Link to="/admin/library" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        ← Kütüphane Alanları
      </Link>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-red-500">📍</span>
        <span className="text-sm text-slate-600">{detail.location || "Konum belirtilmemiş"}</span>
        <span className={detail.isActive ? "admin-badge-active ml-2" : "admin-badge-inactive ml-2"}>
          {detail.isActive ? "Aktif" : "Pasif"}
        </span>
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
              try {
                await updateLibraryMetrics(id, {
                  capacity: capacityInput,
                  currentOccupancy: occupancyInput,
                });
                await load();
              } catch (err: any) {
                setError(err?.response?.data?.message || "Doluluk güncellenemedi.");
              }
            }}
          >
            <div>
              <label className="admin-label">Kapasite</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={capacityInput}
                onChange={(e) => setCapacityInput(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Mevcut Kişi Sayısı</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                max={capacityInput}
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

      <section className="admin-card admin-card-body mt-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Alan Bilgileri</h3>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateLibraryArea(id, {
                name: (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value,
                location: (e.currentTarget.elements.namedItem("location") as HTMLInputElement).value,
                capacity: capacityInput,
                currentOccupancy: occupancyInput,
                isActive: (e.currentTarget.elements.namedItem("isActive") as HTMLInputElement).checked,
              });
              await load();
            } catch (err: any) {
              setError(err?.response?.data?.message || "Alan güncellenemedi.");
            }
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
          <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
            <input name="isActive" type="checkbox" defaultChecked={detail.isActive} />
            Aktif
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="admin-btn-secondary">
              Bilgileri Kaydet
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card admin-card-body mt-6 text-sm text-slate-500">
        Saatlik yoğunluk logları ve gerçek zamanlı sensör entegrasyonu sonraki aşamada eklenecektir.
      </section>
    </AdminLayout>
  );
};

export default AdminLibraryDetailPage;
