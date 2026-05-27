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
}

export interface UpdateAdminUserPayload {
  name: string;
  email: string;
  studentNo?: string | null;
}

export type UserRoleFilter =
  | ""
  | "Student"
  | "Teacher"
  | "Staff"
  | "SuperAdmin"
  | "SubAdmin"
  | "Admin";

export type UserStatusFilter = "all" | "active" | "inactive";

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
  { value: "Staff", label: "Kasiyer / Personel" },
  { value: "SuperAdmin", label: "Sistem Yöneticisi" },
  { value: "SubAdmin", label: "Alt Admin" },
  { value: "Admin", label: "Legacy Admin" },
];
