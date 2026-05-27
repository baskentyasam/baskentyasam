import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { getCurrentUser } from "../services/authService";
import {
  activateAdminUser,
  AdminUser,
  deactivateAdminUser,
  getAdminUsers,
  ROLE_FILTER_OPTIONS,
  updateAdminUser,
  UserRoleFilter,
  UserStatusFilter,
} from "../services/adminUserService";

const emptyForm = { name: "", email: "", studentNo: "" };

const AdminUsersPage: React.FC = () => {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeSuperAdminCount, setActiveSuperAdminCount] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchDraft.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: { role?: string; search?: string; isActive?: boolean } = {};
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter === "active") params.isActive = true;
      if (statusFilter === "inactive") params.isActive = false;

      const [data, activeSuperAdmins] = await Promise.all([
        getAdminUsers(params),
        getAdminUsers({ role: "SuperAdmin", isActive: true }),
      ]);
      setUsers(data);
      setActiveSuperAdminCount(activeSuperAdmins.length);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcılar yüklenemedi.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, debouncedSearch, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (user: AdminUser) => {
    if (user.isLegacyAdmin) return;
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      studentNo: user.studentNo || "",
    });
    setError("");
  };

  const closeEdit = () => {
    setEditUser(null);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || editUser.isLegacyAdmin) return;
    setActionLoading(true);
    setError("");
    try {
      await updateAdminUser(editUser.id, {
        name: form.name,
        email: form.email,
        studentNo: form.studentNo || null,
      });
      closeEdit();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı güncellenemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user: AdminUser, activate: boolean) => {
    const actionLabel = activate ? "aktifleştirmek" : "pasifleştirmek";
    if (!window.confirm(`${user.name} kullanıcısını ${actionLabel} istediğinize emin misiniz?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      if (activate) {
        await activateAdminUser(user.id);
      } else {
        await deactivateAdminUser(user.id);
      }
      await load();
      if (editUser?.id === user.id) {
        closeEdit();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || `İşlem başarısız.`);
    } finally {
      setActionLoading(false);
    }
  };

  const isLastActiveSuperAdmin = useCallback(
    (user: AdminUser) =>
      user.role === "SuperAdmin" && user.isActive && activeSuperAdminCount <= 1,
    [activeSuperAdminCount],
  );

  const canEdit = useCallback((user: AdminUser) => !user.isLegacyAdmin, []);

  const canDeactivate = useCallback(
    (user: AdminUser) => {
      if (user.isLegacyAdmin) return false;
      if (!user.isActive) return false;
      if (currentUserId != null && user.id === currentUserId) return false;
      if (isLastActiveSuperAdmin(user)) return false;
      return true;
    },
    [currentUserId, isLastActiveSuperAdmin],
  );

  const canActivate = useCallback((user: AdminUser) => !user.isLegacyAdmin && !user.isActive, []);

  const getDeactivateHint = useCallback(
    (user: AdminUser): string | null => {
      if (!user.isActive || user.isLegacyAdmin) return null;
      if (currentUserId != null && user.id === currentUserId) {
        return "Kendi hesabınız pasifleştirilemez";
      }
      if (isLastActiveSuperAdmin(user)) {
        return "Son aktif sistem yöneticisi pasifleştirilemez";
      }
      return null;
    },
    [currentUserId, isLastActiveSuperAdmin],
  );

  const summary = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    return { total: users.length, active, inactive: users.length - active };
  }, [users]);

  return (
    <AdminLayout
      title="Kullanıcı Yönetimi"
      subtitle="Öğrenci, öğretim elemanı ve personel hesaplarını buradan görüntüleyebilirsiniz."
    >
      <section className="admin-card admin-card-body mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="admin-label">Ara</label>
            <input
              className="admin-input"
              placeholder="Ad, e-posta veya numara..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Rol</label>
            <select
              className="admin-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRoleFilter)}
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Durum</label>
            <select
              className="admin-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatusFilter)}
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
          <span>Toplam: {summary.total}</span>
          <span>Aktif: {summary.active}</span>
          <span>Pasif: {summary.inactive}</span>
        </div>
      </section>

      {error && (
        <div className="admin-card admin-card-body mb-6 text-sm text-red-600">{error}</div>
      )}

      <section className="admin-card overflow-hidden">
        {loading ? (
          <div className="admin-card-body admin-empty">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="admin-card-body admin-empty">Kriterlere uygun kullanıcı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 font-medium text-slate-700">Ad Soyad</th>
                  <th className="px-6 py-4 font-medium text-slate-700">E-posta</th>
                  <th className="px-6 py-4 font-medium text-slate-700">Rol</th>
                  <th className="px-6 py-4 font-medium text-slate-700">Durum</th>
                  <th className="px-6 py-4 font-medium text-slate-700">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/50 ${
                      user.isLegacyAdmin
                        ? "bg-amber-50/50"
                        : !user.isActive
                          ? "bg-slate-50/80"
                          : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.name}</div>
                      {user.studentNo && (
                        <div className="text-xs text-slate-500">No: {user.studentNo}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={user.isLegacyAdmin ? "font-medium text-amber-800" : "text-slate-700"}>
                          {user.roleDisplayName}
                        </span>
                        {user.isLegacyAdmin && (
                          <span className="admin-badge-inactive border border-amber-200 bg-amber-100 text-amber-800">
                            Eski rol
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          user.isActive
                            ? "admin-badge-active font-medium"
                            : "admin-badge-inactive font-medium"
                        }
                      >
                        {user.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`admin-btn-outline-gray ${
                              !canEdit(user) ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            disabled={!canEdit(user) || actionLoading}
                            title={user.isLegacyAdmin ? "Legacy hesaplar düzenlenemez" : undefined}
                            onClick={() => openEdit(user)}
                          >
                            Düzenle
                          </button>
                          {canActivate(user) && (
                            <button
                              type="button"
                              className="admin-btn-outline-blue"
                              disabled={actionLoading}
                              onClick={() => void handleToggleActive(user, true)}
                            >
                              Aktifleştir
                            </button>
                          )}
                          {canDeactivate(user) && (
                            <button
                              type="button"
                              className="admin-btn-outline-red"
                              disabled={actionLoading}
                              onClick={() => void handleToggleActive(user, false)}
                            >
                              Pasifleştir
                            </button>
                          )}
                        </div>
                        {getDeactivateHint(user) && (
                          <span className="text-xs text-slate-500">{getDeactivateHint(user)}</span>
                        )}
                        {user.isLegacyAdmin && (
                          <span className="text-xs text-amber-700">Bu hesap yönetilemez (legacy).</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card w-full max-w-lg">
            <div className="admin-card-body">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Kullanıcı Düzenle</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {editUser.roleDisplayName} · {editUser.isActive ? "Aktif" : "Pasif"}
                  </p>
                </div>
                <button type="button" className="text-slate-400 hover:text-slate-600" onClick={closeEdit}>
                  ✕
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSave}>
                <div>
                  <label className="admin-label">Ad Soyad</label>
                  <input
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">E-posta</label>
                  <input
                    className="admin-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Öğrenci / Personel No</label>
                  <input
                    className="admin-input"
                    value={form.studentNo}
                    onChange={(e) => setForm((f) => ({ ...f, studentNo: e.target.value }))}
                    placeholder="Varsa"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Rol değiştirme ve şifre sıfırlama bu aşamada desteklenmemektedir.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" className="admin-btn-primary" disabled={actionLoading}>
                    Kaydet
                  </button>
                  <button type="button" className="admin-btn-secondary" onClick={closeEdit}>
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsersPage;
