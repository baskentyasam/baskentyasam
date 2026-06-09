import apiClient from "../api/axios";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleDisplayName: string;
  isActive: boolean;
  studentNo?: string | null;
  isLegacyAdmin: boolean;
  subAdminModuleType?: string | null;
  subAdminScopeKey?: string | null;
  subAdminScopeDisplayName?: string | null;
}

export interface UpdateAdminUserPayload {
  name: string;
  email: string;
  studentNo?: string | null;
}

export interface UpdateAdminUserRolePayload {
  role: string;
  moduleType?: string;
  scopeKey?: string;
  scopeDisplayName?: string;
}

export type UserRoleFilter =
  | ""
  | "Student"
  | "Teacher"
  | "Personnel"
  | "Staff"
  | "SuperAdmin"
  | "SubAdmin";

export type UserStatusFilter = "all" | "active" | "inactive";

export type AssignableAdminRole =
  | "Student"
  | "Teacher"
  | "Personnel"
  | "Staff"
  | "SuperAdmin"
  | "SubAdmin";

export const ASSIGNABLE_ROLE_OPTIONS: { value: AssignableAdminRole; label: string }[] = [
  { value: "Student", label: "Öğrenci" },
  { value: "Teacher", label: "Öğretim Elemanı" },
  { value: "Personnel", label: "İdari Personel" },
  { value: "Staff", label: "Kasiyer" },
  { value: "SuperAdmin", label: "Admin Sistem Yöneticisi" },
  { value: "SubAdmin", label: "Alt Admin" },
];

export const getAdminUsers = async (params?: {
  role?: string;
  search?: string;
  isActive?: boolean;
}): Promise<AdminUser[]> => {
  const res = await apiClient.get<AdminUser[]>("/admin/users", { params });
  return res.data;
};

export const getAdminUserById = async (id: number): Promise<AdminUser> => {
  const res = await apiClient.get<AdminUser>(`/admin/users/${id}`);
  return res.data;
};

export const updateAdminUser = async (id: number, payload: UpdateAdminUserPayload): Promise<AdminUser> => {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}`, payload);
  return res.data;
};

export const updateAdminUserRole = async (
  id: number,
  payload: UpdateAdminUserRolePayload,
): Promise<AdminUser> => {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}/role`, payload);
  return res.data;
};

export const resetAdminUserPassword = async (id: number, newPassword: string): Promise<void> => {
  await apiClient.put(`/admin/users/${id}/password`, { newPassword });
};

export const activateAdminUser = async (id: number): Promise<AdminUser> => {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}/activate`);
  return res.data;
};

export const deactivateAdminUser = async (id: number): Promise<AdminUser> => {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}/deactivate`);
  return res.data;
};

export const ROLE_FILTER_OPTIONS: { value: UserRoleFilter; label: string }[] = [
  { value: "", label: "Tüm roller" },
  { value: "Student", label: "Öğrenci" },
  { value: "Teacher", label: "Öğretim Elemanı" },
  { value: "Personnel", label: "İdari Personel" },
  { value: "Staff", label: "Kasiyer" },
  { value: "SuperAdmin", label: "Admin Sistem Yöneticisi" },
  { value: "SubAdmin", label: "Alt Admin" },
];
