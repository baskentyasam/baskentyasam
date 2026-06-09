import apiClient from "../api/axios";

export type AdminRole = "superadmin" | "subadmin";

export interface AdminAssignment {
  id: number;
  moduleType: "Cafeteria" | "Parking" | "Library" | "Appointment";
  scopeKey: string;
  scopeDisplayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface SubAdminListItem {
  userId: number;
  name: string;
  email: string;
  isActive: boolean;
  role: string;
  assignment?: AdminAssignment | null;
}

export interface AssignableScope {
  scopeKey: string;
  scopeDisplayName: string;
}

export interface Cafeteria {
  id: number;
  name: string;
  location?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MenuItemAdmin {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  cafeteriaId?: number;
}

export interface OrderItemResponse {
  id: number;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  price: number;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  userId: number;
  customerName?: string;
  customerEmail?: string;
  studentNo?: string;
  totalAmount: number;
  status: string;
  isPaid: boolean;
  createdAt: string;
  pickupTime?: string;
  note?: string;
  orderItems: OrderItemResponse[];
}

export interface ParkingLot {
  id: number;
  name: string;
  location?: string;
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdAt: string;
}

export interface LibraryFloorAdmin {
  id: number;
  code: string;
  name: string;
  maxCapacity: number;
  isOpen: boolean;
  sortOrder: number;
}

export type LibraryScheduleMode = "manual" | "normal" | "exam";

export interface LibraryAdminOverview {
  currentOccupancy: number;
  openCapacity: number;
  availableSlots: number;
  occupancyRate: number;
  lastUpdatedAt?: string | null;
  scheduleMode: LibraryScheduleMode;
  scheduleDescription: string;
  examOpenFloorCodes: string[];
  floors: LibraryFloorAdmin[];
}

/** @deprecated Eski alan tabanlı model */
export interface LibraryArea {
  id: number;
  name: string;
  location?: string;
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdAt: string;
}

export interface MyAdminAssignmentResponse {
  isSuperAdmin: boolean;
  role: string;
  assignment?: AdminAssignment | null;
}

export const getSubAdmins = async () => {
  const res = await apiClient.get<SubAdminListItem[]>("/admin/sub-admins");
  return res.data;
};

export const getAssignableScopes = async (moduleType: "Cafeteria" | "Parking" | "Library" | "Appointment") => {
  const res = await apiClient.get<AssignableScope[]>("/admin/sub-admins/assignable-scopes", {
    params: { moduleType },
  });
  return res.data;
};

export const createSubAdmin = async (payload: {
  name: string;
  email: string;
  password: string;
  moduleType: string;
  scopeKey: string;
  scopeDisplayName: string;
}) => {
  const res = await apiClient.post<SubAdminListItem>("/admin/sub-admins", payload);
  return res.data;
};

export const deactivateSubAdmin = async (userId: number) => {
  await apiClient.put(`/admin/sub-admins/${userId}/deactivate`);
};

export const getAdminCafeterias = async () => {
  const res = await apiClient.get<Cafeteria[]>("/admin/cafeterias");
  return res.data;
};

export const createCafeteria = async (payload: Partial<Cafeteria>) => {
  const res = await apiClient.post<Cafeteria>("/admin/cafeterias", payload);
  return res.data;
};

export const updateCafeteria = async (id: number, payload: Partial<Cafeteria>) => {
  const res = await apiClient.put<Cafeteria>(`/admin/cafeterias/${id}`, payload);
  return res.data;
};

export const getCafeteriaDetail = async (id: number) => {
  const res = await apiClient.get<Cafeteria>(`/admin/cafeterias/${id}`);
  return res.data;
};

export const getCafeteriaMenuItems = async (id: number) => {
  const res = await apiClient.get<MenuItemAdmin[]>(`/admin/cafeterias/${id}/menu-items`);
  return res.data;
};

export const createCafeteriaMenuItem = async (cafeteriaId: number, payload: Partial<MenuItemAdmin>) => {
  const res = await apiClient.post<MenuItemAdmin>(`/admin/cafeterias/${cafeteriaId}/menu-items`, payload);
  return res.data;
};

export const updateCafeteriaMenuItem = async (cafeteriaId: number, menuItemId: number, payload: Partial<MenuItemAdmin>) => {
  const res = await apiClient.put<MenuItemAdmin>(`/admin/cafeterias/${cafeteriaId}/menu-items/${menuItemId}`, payload);
  return res.data;
};

export const deleteCafeteriaMenuItem = async (cafeteriaId: number, menuItemId: number) => {
  await apiClient.delete(`/admin/cafeterias/${cafeteriaId}/menu-items/${menuItemId}`);
};

export const getCafeteriaOrders = async (cafeteriaId: number) => {
  const res = await apiClient.get<OrderResponse[]>(`/admin/cafeterias/${cafeteriaId}/orders`);
  return res.data;
};

export const getAdminParkingLots = async () => {
  const res = await apiClient.get<ParkingLot[]>("/admin/parking");
  return res.data;
};

export const createParkingLot = async (payload: Partial<ParkingLot>) => {
  const res = await apiClient.post<ParkingLot>("/admin/parking", payload);
  return res.data;
};

export const updateParkingLot = async (id: number, payload: Partial<ParkingLot>) => {
  const res = await apiClient.put<ParkingLot>(`/admin/parking/${id}`, payload);
  return res.data;
};

export const getParkingLotDetail = async (id: number) => {
  const res = await apiClient.get<ParkingLot>(`/admin/parking/${id}`);
  return res.data;
};

export const updateParkingMetrics = async (id: number, payload: { capacity: number; currentOccupancy: number }) => {
  const res = await apiClient.put<ParkingLot>(`/admin/parking/${id}/metrics`, payload);
  return res.data;
};

export const getLibraryAdminOverview = async () => {
  const res = await apiClient.get<LibraryAdminOverview>("/admin/library/overview");
  return res.data;
};

export const updateLibraryOpenFloors = async (openFloorCodes: string[]) => {
  const res = await apiClient.put<LibraryAdminOverview>("/admin/library/floors/open", { openFloorCodes });
  return res.data;
};

export const updateLibraryCapacities = async (
  floors: { code: string; maxCapacity: number }[],
) => {
  const res = await apiClient.put<LibraryAdminOverview>("/admin/library/floors/capacities", { floors });
  return res.data;
};

export const updateLibraryOccupancy = async (currentOccupancy: number) => {
  const res = await apiClient.put<LibraryAdminOverview>("/admin/library/occupancy", { currentOccupancy });
  return res.data;
};

export const updateLibraryScheduleMode = async (scheduleMode: LibraryScheduleMode) => {
  const res = await apiClient.put<LibraryAdminOverview>("/admin/library/schedule/mode", { scheduleMode });
  return res.data;
};

export const updateLibraryExamFloors = async (openFloorCodes: string[]) => {
  const res = await apiClient.put<LibraryAdminOverview>("/admin/library/schedule/exam-floors", { openFloorCodes });
  return res.data;
};

export const getMyAdminAssignment = async () => {
  const res = await apiClient.get<MyAdminAssignmentResponse>("/admin/me/assignment");
  return res.data;
};
