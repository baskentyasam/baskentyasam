import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Cafeteria, createCafeteria, getAdminCafeterias, updateCafeteria } from "../services/adminService";

const emptyForm = { name: "", location: "", description: "", isActive: true };

const AdminCafeteriasPage: React.FC = () => {
  const [list, setList] = useState<Cafeteria[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState<Cafeteria | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = async () => setList(await getAdminCafeterias());

  useEffect(() => {
    load().catch(() => setError("Kafeteryalar yüklenemedi."));
  }, []);

  const resetForms = () => {
    setShowCreateForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const startEdit = (c: Cafeteria) => {
    setShowCreateForm(false);
    setEditing(c);
    setForm({
      name: c.name,
      location: c.location || "",
      description: c.description || "",
      isActive: c.isActive,
    });
  };

  return (
    <AdminLayout
      title="Kafeterya Yönetimi"
      subtitle="Kafeteryaları yönetin; her kafeteryanın detayında menü, sipariş, ödeme ve borç bölümlerine erişebilirsiniz."
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
          {showCreateForm ? "✕ İptal" : "+ Yeni Kafeterya"}
        </button>
      </div>

      {showCreateForm && (
        <section className="admin-card admin-card-body mb-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Yeni Kafeterya</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createCafeteria(form);
                resetForms();
                await load();
              } catch (err: any) {
                setError(err?.response?.data?.message || "Kafeterya eklenemedi.");
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
            <div className="md:col-span-2">
              <label className="admin-label">Açıklama</label>
              <input
                className="admin-input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
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
          <h2 className="mb-5 text-base font-semibold text-slate-900">Kafeteryayı Düzenle</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateCafeteria(editing.id, form);
                resetForms();
                await load();
              } catch (err: any) {
                setError(err?.response?.data?.message || "Kafeterya güncellenemedi.");
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
            <div className="md:col-span-2">
              <label className="admin-label">Açıklama</label>
              <input
                className="admin-input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
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

      <div className="admin-grid-3">
        {list.map((c) => (
          <article key={c.id} className="admin-card admin-card-body flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{c.name}</h3>
              <span className={c.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                {c.isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-600">
              <span className="text-red-500">📍</span>
              <span>{c.location || "Konum belirtilmemiş"}</span>
            </div>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-500">{c.description || "Açıklama yok"}</p>
            <div className="flex flex-wrap gap-2">
              <Link className="admin-btn-outline-blue" to={`/admin/cafeteria/${c.id}`}>
                Menü · Sipariş · Borç
              </Link>
              <button type="button" className="admin-btn-outline-gray" onClick={() => startEdit(c)}>
                Düzenle
              </button>
              <button
                type="button"
                className="admin-btn-outline-red"
                onClick={async () => {
                  await updateCafeteria(c.id, {
                    name: c.name,
                    location: c.location,
                    description: c.description,
                    isActive: !c.isActive,
                  });
                  await load();
                }}
              >
                {c.isActive ? "Devre Dışı" : "Aktifleştir"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminCafeteriasPage;
