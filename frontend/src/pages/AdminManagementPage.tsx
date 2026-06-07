import React, { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  createSubAdmin,
  deactivateSubAdmin,
  getAssignableScopes,
  getSubAdmins,
  SubAdminListItem,
  AssignableScope,
} from "../services/adminService";

const AdminManagementPage: React.FC = () => {
  const [list, setList] = useState<SubAdminListItem[]>([]);
  const [moduleType, setModuleType] = useState<"Cafeteria" | "Parking" | "Library" | "Appointment">("Cafeteria");
  const [scopes, setScopes] = useState<AssignableScope[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    scopeKey: "",
    scopeDisplayName: "",
  });
  const [error, setError] = useState("");

  const load = async () => {
    const [subAdmins, s] = await Promise.all([getSubAdmins(), getAssignableScopes(moduleType)]);
    setList(subAdmins);
    setScopes(s);
  };

  useEffect(() => {
    load().catch(() => setError("Veriler yüklenemedi."));
  }, []);

  useEffect(() => {
    getAssignableScopes(moduleType)
      .then((s) => {
        setScopes(s);
        if (
          s.length === 1 &&
          (moduleType === "Library" || moduleType === "Appointment")
        ) {
          setForm((f) => ({
            ...f,
            scopeKey: s[0].scopeKey,
            scopeDisplayName: s[0].scopeDisplayName,
          }));
        }
      })
      .catch(() => setError("Kapsam listesi yüklenemedi."));
  }, [moduleType]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (moduleType === "Library" || moduleType === "Appointment") {
      setError("Kütüphane ve randevu modülleri bu aşamada devre dışıdır.");
      return;
    }
    try {
      await createSubAdmin({
        name: form.name,
        email: form.email,
        password: form.password,
        moduleType,
        scopeKey: form.scopeKey,
        scopeDisplayName: form.scopeDisplayName,
      });
      setForm({ name: "", email: "", password: "", scopeKey: "", scopeDisplayName: "" });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "SubAdmin oluşturulamadı.");
    }
  };

  return (
    <AdminLayout title="Alt Admin Yönetimi">
      <div className="mb-6 flex items-center justify-end">
        <button
          type="button"
          className={showForm ? "admin-btn-secondary" : "admin-btn-primary"}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "✕ İptal" : "+ Yeni Alt Admin"}
        </button>
      </div>

      {showForm && (
        <section className="admin-card admin-card-body mb-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Yeni Alt Admin</h2>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <div>
              <label className="admin-label">Ad Soyad</label>
              <input
                className="admin-input"
                placeholder="Ahmet Yılmaz"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">E-posta</label>
              <input
                className="admin-input"
                placeholder="altadmin@baskent.edu.tr"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Şifre</label>
              <input
                className="admin-input"
                placeholder="En az 6 karakter"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="admin-label">Modül</label>
              <select
                className="admin-input"
                value={moduleType}
                onChange={(e) => setModuleType(e.target.value as typeof moduleType)}
              >
                <option value="Cafeteria">Kafeterya</option>
                <option value="Parking">Otopark</option>
                <option value="Library">Kütüphane</option>
                <option value="Appointment">Randevu</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="admin-label">Kapsam</label>
              <select
                className="admin-input"
                value={form.scopeKey}
                onChange={(e) => {
                  const found = scopes.find((s) => s.scopeKey === e.target.value);
                  setForm((f) => ({ ...f, scopeKey: e.target.value, scopeDisplayName: found?.scopeDisplayName || "" }));
                }}
                disabled={false}
                required={moduleType === "Cafeteria" || moduleType === "Parking"}
              >
                <option value="">Kapsam seçin</option>
                {scopes.map((s) => (
                  <option key={s.scopeKey} value={s.scopeKey}>
                    {s.scopeDisplayName}
                  </option>
                ))}
              </select>
            </div>
            {error && <div className="text-sm text-red-600 md:col-span-2">{error}</div>}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="admin-btn-primary"
                disabled={false}
              >
                Alt Admin Oluştur
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card admin-card-body">
        <h2 className="mb-5 text-base font-semibold text-slate-900">Alt Yöneticiler ({list.length})</h2>
        {list.length === 0 ? (
          <div className="admin-empty">Henüz alt yönetici tanımlanmamış.</div>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <div
                key={a.userId}
                className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">{a.name}</div>
                  <div className="text-sm text-slate-600">{a.email}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {a.assignment ? `${a.assignment.moduleType} - ${a.assignment.scopeDisplayName}` : "Atama yok"}
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-btn-outline-gray"
                  onClick={async () => {
                    await deactivateSubAdmin(a.userId);
                    await load();
                  }}
                >
                  Pasifleştir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
};

export default AdminManagementPage;
