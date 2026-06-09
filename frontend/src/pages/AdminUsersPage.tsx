import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { getAssignableScopes, AssignableScope } from "../services/adminService";
import { getCurrentUser } from "../services/authService";
import {
  activateAdminUser,
  AdminUser,
  ASSIGNABLE_ROLE_OPTIONS,
  AssignableAdminRole,
  deactivateAdminUser,
  getAdminUserById,
  getAdminUsers,
  resetAdminUserPassword,
  ROLE_FILTER_OPTIONS,
  updateAdminUser,
  updateAdminUserRole,
  UserRoleFilter,
  UserStatusFilter,
} from "../services/adminUserService";
import { PASSWORD_POLICY_MESSAGE, validatePassword } from "../utils/passwordPolicy";

const emptyForm = { name: "", email: "", studentNo: "" };

type ModuleType = "Cafeteria" | "Parking" | "Library";

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

  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [roleForm, setRoleForm] = useState<{
    role: AssignableAdminRole;
    moduleType: ModuleType;
    scopeKey: string;
  }>({ role: "Student", moduleType: "Cafeteria", scopeKey: "" });
  const [roleScopes, setRoleScopes] = useState<AssignableScope[]>([]);

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  useEffect(() => {
    if (!roleUser || roleForm.role !== "SubAdmin") {
      setRoleScopes([]);
      return;
    }
    getAssignableScopes(roleForm.moduleType)
      .then((scopes) => {
        setRoleScopes(scopes);
        if (
          scopes.length === 1 &&
          roleForm.moduleType === "Library"
        ) {
          setRoleForm((f) => ({ ...f, scopeKey: scopes[0].scopeKey }));
        }
      })
      .catch(() => setRoleScopes([]));
  }, [roleUser, roleForm.role, roleForm.moduleType]);

  const openEdit = (user: AdminUser) => {
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

  const openRoleModal = async (user: AdminUser) => {
    setError("");
    try {
      const detail = await getAdminUserById(user.id);
      setRoleUser(detail);
      const currentRole = ASSIGNABLE_ROLE_OPTIONS.some((r) => r.value === detail.role)
        ? (detail.role as AssignableAdminRole)
        : "Student";
      const moduleType: ModuleType =
        detail.subAdminModuleType === "Parking"
          ? "Parking"
          : detail.subAdminModuleType === "Library"
            ? "Library"
            : "Cafeteria";
      setRoleForm({
        role: currentRole,
        moduleType,
        scopeKey: detail.subAdminScopeKey || "",
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı bilgisi yüklenemedi.");
    }
  };

  const closeRoleModal = () => {
    setRoleUser(null);
    setRoleForm({ role: "Student", moduleType: "Cafeteria", scopeKey: "" });
    setRoleScopes([]);
  };

  const openPasswordModal = (user: AdminUser) => {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const closePasswordModal = () => {
    setPasswordUser(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
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

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleUser) return;

    if (roleForm.role === "SubAdmin" && !roleForm.scopeKey) {
      setError("Alt admin için yönetim kapsamı seçiniz.");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      const selectedScope = roleScopes.find((s) => s.scopeKey === roleForm.scopeKey);
      await updateAdminUserRole(roleUser.id, {
        role: roleForm.role,
        moduleType: roleForm.role === "SubAdmin" ? roleForm.moduleType : undefined,
        scopeKey: roleForm.role === "SubAdmin" ? roleForm.scopeKey : undefined,
        scopeDisplayName:
          roleForm.role === "SubAdmin" ? selectedScope?.scopeDisplayName : undefined,
      });
      closeRoleModal();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Rol güncellenemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;

    const policyError = validatePassword(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      await resetAdminUserPassword(passwordUser.id, newPassword);
      closePasswordModal();
      setError("");
      window.alert(`${passwordUser.name} kullanıcısının şifresi güncellendi.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Şifre güncellenemedi.");
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
      if (editUser?.id === user.id) closeEdit();
    } catch (err: any) {
      setError(err?.response?.data?.message || "İşlem başarısız.");
    } finally {
      setActionLoading(false);
    }
  };

  const isLastActiveSuperAdmin = useCallback(
    (user: AdminUser) =>
      user.role === "SuperAdmin" && user.isActive && activeSuperAdminCount <= 1,
    [activeSuperAdminCount],
  );

  const canChangeRole = useCallback(
    (user: AdminUser) => currentUserId == null || user.id !== currentUserId,
    [currentUserId],
  );

  const canDeactivate = useCallback(
    (user: AdminUser) => {
      if (!user.isActive) return false;
      if (currentUserId != null && user.id === currentUserId) return false;
      if (isLastActiveSuperAdmin(user)) return false;
      return true;
    },
    [currentUserId, isLastActiveSuperAdmin],
  );

  const canActivate = useCallback((user: AdminUser) => !user.isActive, []);

  const getDeactivateHint = useCallback(
    (user: AdminUser): string | null => {
      if (!user.isActive) return null;
      if (currentUserId != null && user.id === currentUserId) {
        return "Kendi hesabınız pasifleştirilemez";
      }
      if (isLastActiveSuperAdmin(user)) {
        return "Son aktif admin sistem yöneticisi pasifleştirilemez";
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
            <table className="w-full min-w-[900px] text-left text-sm">
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
                    className={`hover:bg-slate-50/50 ${!user.isActive ? "bg-slate-50/80" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.name}</div>
                      {user.studentNo && (
                        <div className="text-xs text-slate-500">No: {user.studentNo}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-700">{user.roleDisplayName}</td>
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
                            className="admin-btn-outline-gray"
                            disabled={actionLoading}
                            onClick={() => openEdit(user)}
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="admin-btn-outline-blue"
                            disabled={actionLoading || !canChangeRole(user)}
                            title={
                              !canChangeRole(user)
                                ? "Kendi rolünüzü buradan değiştiremezsiniz"
                                : undefined
                            }
                            onClick={() => void openRoleModal(user)}
                          >
                            Rol Değiştir
                          </button>
                          <button
                            type="button"
                            className="admin-btn-outline-blue"
                            disabled={actionLoading}
                            onClick={() => openPasswordModal(user)}
                          >
                            Şifre Sıfırla
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

      {roleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card w-full max-w-lg">
            <div className="admin-card-body">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Rol Değiştir</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {roleUser.name} · Mevcut: {roleUser.roleDisplayName}
                  </p>
                </div>
                <button type="button" className="text-slate-400 hover:text-slate-600" onClick={closeRoleModal}>
                  ✕
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSaveRole}>
                <div>
                  <label className="admin-label">Yeni Rol</label>
                  <select
                    className="admin-input"
                    value={roleForm.role}
                    onChange={(e) =>
                      setRoleForm((f) => ({
                        ...f,
                        role: e.target.value as AssignableAdminRole,
                      }))
                    }
                  >
                    {ASSIGNABLE_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {roleForm.role === "SubAdmin" && (
                  <>
                    <div>
                      <label className="admin-label">Yönetim Modülü</label>
                      <select
                        className="admin-input"
                        value={roleForm.moduleType}
                        onChange={(e) =>
                          setRoleForm((f) => ({
                            ...f,
                            moduleType: e.target.value as ModuleType,
                            scopeKey: "",
                          }))
                        }
                      >
                        <option value="Cafeteria">Kafeterya</option>
                        <option value="Parking">Otopark</option>
                        <option value="Library">Kütüphane</option>
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Yönetim Kapsamı</label>
                      <select
                        className="admin-input"
                        value={roleForm.scopeKey}
                        onChange={(e) =>
                          setRoleForm((f) => ({ ...f, scopeKey: e.target.value }))
                        }
                        required
                        disabled={roleForm.moduleType === "Library"}
                      >
                        <option value="">Seçiniz...</option>
                        {roleScopes.map((scope) => (
                          <option key={scope.scopeKey} value={scope.scopeKey}>
                            {scope.scopeDisplayName}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        {roleForm.moduleType === "Library" &&
                          "Kütüphane alt admini tüm kütüphane yönetimini kullanır."}
                        {(roleForm.moduleType === "Cafeteria" ||
                          roleForm.moduleType === "Parking") &&
                          "Alt admin yalnızca seçilen kafeterya veya otoparkı yönetebilir."}
                      </p>
                    </div>
                  </>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" className="admin-btn-primary" disabled={actionLoading}>
                    Rolü Kaydet
                  </button>
                  <button type="button" className="admin-btn-secondary" onClick={closeRoleModal}>
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card w-full max-w-lg">
            <div className="admin-card-body">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Şifre Sıfırla</h3>
                  <p className="mt-1 text-sm text-slate-500">{passwordUser.name}</p>
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={closePasswordModal}
                >
                  ✕
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSavePassword}>
                <div>
                  <label className="admin-label">Yeni Şifre</label>
                  <input
                    className="admin-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Yeni Şifre (Tekrar)</label>
                  <input
                    className="admin-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" className="admin-btn-primary" disabled={actionLoading}>
                    Şifreyi Kaydet
                  </button>
                  <button type="button" className="admin-btn-secondary" onClick={closePasswordModal}>
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
