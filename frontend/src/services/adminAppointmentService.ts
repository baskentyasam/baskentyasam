import apiClient from "../api/axios";

export interface AdminAppointment {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  studentNo?: string | null;
  teacherId: number;
  teacherName: string;
  teacherEmail: string;
  teacherFacultyId?: number | null;
  teacherFacultyName: string;
  teacherDepartmentId?: number | null;
  teacherDepartmentName: string;
  date: string;
  time: string;
  subject: string;
  requestReason: string;
  status: string;
  statusDisplayName: string;
  rejectionReason?: string | null;
  createdAt: string;
  respondedAt?: string | null;
}

export interface AdminAppointmentTeacher {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isVisibleForAppointment: boolean;
  facultyId?: number | null;
  facultyName: string;
  departmentId?: number | null;
  departmentName: string;
  totalAppointments: number;
  pendingAppointments: number;
  approvedAppointments: number;
  rejectedAppointments: number;
}

export interface AdminFaculty {
  id: number;
  name: string;
  isActive: boolean;
}

export interface AdminDepartment {
  id: number;
  facultyId: number;
  facultyName: string;
  name: string;
  isActive: boolean;
}

export interface AdminFacultyHierarchy extends AdminFaculty {
  departments: AdminDepartment[];
}

export interface AdminScheduleSlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  courseName: string;
  slot: string;
}

export type AppointmentStatusFilter = "" | "Pending" | "Approved" | "Rejected";

export const STATUS_FILTER_OPTIONS: { value: AppointmentStatusFilter; label: string }[] = [
  { value: "", label: "Tüm durumlar" },
  { value: "Pending", label: "Bekliyor" },
  { value: "Approved", label: "Onaylandı" },
  { value: "Rejected", label: "Reddedildi / İptal" },
];

const formatDate = (date: string) => {
  try {
    return new Date(date).toLocaleDateString("tr-TR");
  } catch {
    return date;
  }
};

const formatTime = (time: string) => {
  if (!time) return "—";
  const parts = time.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return time;
};

export const formatAppointmentDateTime = (date: string, time: string) =>
  `${formatDate(date)} ${formatTime(time)}`;

export const getAdminFaculties = async (): Promise<AdminFaculty[]> => {
  const res = await apiClient.get<AdminFaculty[]>("/admin/appointments/faculties");
  return res.data;
};

export const getAdminDepartments = async (facultyId?: number): Promise<AdminDepartment[]> => {
  const res = await apiClient.get<AdminDepartment[]>("/admin/appointments/departments", {
    params: facultyId ? { facultyId } : undefined,
  });
  return res.data;
};

export const getAdminFacultyHierarchy = async (): Promise<AdminFacultyHierarchy[]> => {
  const res = await apiClient.get<AdminFacultyHierarchy[]>("/admin/appointments/faculties/hierarchy");
  return res.data;
};

export const getAdminAppointments = async (params?: {
  teacherId?: number;
  facultyId?: number;
  departmentId?: number;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}): Promise<AdminAppointment[]> => {
  const res = await apiClient.get<AdminAppointment[]>("/admin/appointments", { params });
  return res.data;
};

export const cancelAdminAppointment = async (id: number, reason?: string): Promise<AdminAppointment> => {
  const res = await apiClient.put<AdminAppointment>(`/admin/appointments/${id}/cancel`, { reason });
  return res.data;
};

export const getAdminAppointmentTeachers = async (params?: {
  search?: string;
  isActive?: boolean;
  facultyId?: number;
  departmentId?: number;
}): Promise<AdminAppointmentTeacher[]> => {
  const res = await apiClient.get<AdminAppointmentTeacher[]>("/admin/appointments/teachers", { params });
  return res.data;
};

export const assignTeacherDepartment = async (
  teacherId: number,
  departmentId: number | null,
): Promise<AdminAppointmentTeacher> => {
  const res = await apiClient.put<AdminAppointmentTeacher>(
    `/admin/appointments/teachers/${teacherId}/department`,
    { departmentId },
  );
  return res.data;
};

export const setTeacherAppointmentVisibility = async (
  teacherId: number,
  isVisibleForAppointment: boolean,
): Promise<AdminAppointmentTeacher> => {
  const res = await apiClient.put<AdminAppointmentTeacher>(
    `/admin/appointments/teachers/${teacherId}/appointment-visibility`,
    { isVisibleForAppointment },
  );
  return res.data;
};

export const getAdminTeacherSchedule = async (teacherId: number): Promise<AdminScheduleSlot[]> => {
  const res = await apiClient.get<AdminScheduleSlot[]>(`/admin/appointments/teachers/${teacherId}/schedule`);
  return res.data;
};
