import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import {
  LibraryArea,
  activateLibraryArea,
  createLibraryArea,
  deactivateLibraryArea,
  getAdminLibraryAreas,
  updateLibraryArea,
} from "../services/adminService";

const emptyForm = { name: "", location: "", capacity: 0, currentOccupancy: 0, isActive: true };

const AdminLibraryPage: React.FC = () => {
  const [list, setList] = useState<LibraryArea[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState<LibraryArea | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = async () => setList(await getAdminLibraryAreas());

  useEffect(() => {
    load().catch(() => setError("Kütüphane alanları yüklenemedi."));
  }, []);

  const resetForms = () => {
    setShowCreateForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const startEdit = (area: LibraryArea) => {
    setShowCreateForm(false);
    setEditing(area);
    setForm({
      name: area.name,
      location: area.location || "",
      capacity: area.capacity,
      currentOccupancy: area.currentOccupancy,
      isActive: area.isActive,
    });
  };

  const occupancyRate = (area: LibraryArea) =>
    area.capacity > 0 ? Math.round((area.currentOccupancy / area.capacity) * 100) : 0;

  return (
    <AdminLayout
      title="Kütüphane Yönetimi"
      subtitle="Çalışma alanlarını, kapasite ve doluluk bilgilerini buradan yönetebilirsiniz."
    >
      <div className="mb-6 flex items-center justify-end">
        <button
          type="button"
          className={showCreateForm ? "admin-btn-secondary" : "admin-btn-primary"}
          onClick={() => {
            if (showCreateForm) resetForms();
            else {
              setEditing(null);
              setForm(emptyForm);
              setShowCreateForm(true);
            }
          }}
        >
          {showCreateForm ? "✕ İptal" : "+ Yeni Alan"}
        </button>
      </div>

      {showCreateForm && (
        <section className="admin-card admin-card-body mb-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Yeni Kütüphane Alanı</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createLibraryArea(form);
                resetForms();
                await load();
              } catch (err: any) {
                setError(err?.response?.data?.message || "Alan eklenemedi.");
              }
            }}
          >
            <div>
              <label className="admin-label">Ad *</label>
              <input
                className="admin-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Konum</label>
              <input
                className="admin-input"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label className="admin-label">Kapasite</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Mevcut Doluluk</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={form.currentOccupancy}
                onChange={(e) => setForm((f) => ({ ...f, currentOccupancy: Number(e.target.value) }))}
                required
              />
            </div>
            <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Aktif
            </label>
            {error && <div className="text-sm text-red-600 md:col-span-2">{error}</div>}
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="admin-btn-primary">
                Kaydet
              </button>
              <button type="button" className="admin-btn-secondary" onClick={resetForms}>
                İptal
              </button>
            </div>
          </form>
        </section>
      )}

      {editing && (
        <section className="admin-card admin-card-body mb-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Alanı Düzenle</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateLibraryArea(editing.id, form);
                resetForms();
                await load();
              } catch (err: any) {
                setError(err?.response?.data?.message || "Alan güncellenemedi.");
              }
            }}
          >
            <div>
              <label className="admin-label">Ad *</label>
              <input
                className="admin-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Konum</label>
              <input
                className="admin-input"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label className="admin-label">Kapasite</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Mevcut Doluluk</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={form.currentOccupancy}
                onChange={(e) => setForm((f) => ({ ...f, currentOccupancy: Number(e.target.value) }))}
                required
              />
            </div>
            <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Aktif
            </label>
            {error && <div className="text-sm text-red-600 md:col-span-2">{error}</div>}
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="admin-btn-primary">
                Kaydet
              </button>
              <button type="button" className="admin-btn-secondary" onClick={resetForms}>
                İptal
              </button>
            </div>
          </form>
        </section>
      )}

      {error && !showCreateForm && !editing && (
        <div className="admin-card admin-card-body mb-6 text-sm text-red-600">{error}</div>
      )}

      <div className="admin-grid-3">
        {list.map((area) => {
          const rate = occupancyRate(area);
          return (
            <article key={area.id} className="admin-card admin-card-body flex flex-col">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">{area.name}</h3>
                <span className={area.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                  {area.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-red-500">📍</span>
                <span>{area.location || "Konum belirtilmemiş"}</span>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>Doluluk</span>
                <span>
                  {area.currentOccupancy}/{area.capacity} (%{rate})
                </span>
              </div>
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${rate}%` }} />
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link className="admin-btn-outline-blue" to={`/admin/library/${area.id}`}>
                  Doluluk Güncelle
                </Link>
                <button type="button" className="admin-btn-outline-gray" onClick={() => startEdit(area)}>
                  Düzenle
                </button>
                <button
                  type="button"
                  className="admin-btn-outline-red"
                  onClick={async () => {
                    try {
                      if (area.isActive) {
                        await deactivateLibraryArea(area.id);
                      } else {
                        await activateLibraryArea(area.id);
                      }
                      await load();
                    } catch (err: any) {
                      setError(err?.response?.data?.message || "Durum güncellenemedi.");
                    }
                  }}
                >
                  {area.isActive ? "Pasifleştir" : "Aktifleştir"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default AdminLibraryPage;
