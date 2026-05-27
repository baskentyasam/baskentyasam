import apiClient from '../api/axios';

export interface ActiveCafeteria {
  id: number;
  name: string;
  location?: string | null;
  description?: string | null;
}

export interface MenuItemFromApi {
  id: number;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface CreateOrderRequest {
  cafeteriaId: number;
  orderItems: { menuItemId: number; quantity: number }[];
  pickupTime: string;
  note?: string;
}

export interface OrderItemResponse {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderResponse {
  id: number;
  cafeteriaId?: number;
  cafeteriaName?: string;
  items: OrderItemResponse[];
  totalPrice: number;
  pickupTime: string;
  note: string | null;
  status: string;
  createdAt: string;
}

/** Kasiyerde "Ödenmedi" (NotPaid) — limit yalnızca bunları sayar */
export interface UnpaidOrderLine {
  id: number;
  orderNumber: string;
  createdAtUtc: string;
  items: OrderItemResponse[];
  totalPrice: number;
  pickupTime: string;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface MyUnpaidOrdersSummary {
  count: number;
  totalDebt: number;
  unpaidLimit: number;
  orders: UnpaidOrderLine[];
}

export const getActiveCafeterias = async (): Promise<ActiveCafeteria[]> => {
  const response = await apiClient.get<ActiveCafeteria[]>('/cafeterias/active');
  return response.data;
};

export const getMenuByCafeteria = async (cafeteriaId: number): Promise<MenuItemFromApi[]> => {
  const response = await apiClient.get<MenuItemFromApi[]>(`/cafeterias/${cafeteriaId}/menu`);
  return response.data;
};

/** @deprecated Aşama 6+: getMenuByCafeteria kullanın */
export const getMenuItems = async (): Promise<MenuItemFromApi[]> => {
  const response = await apiClient.get<MenuItemFromApi[]>('/Menu');
  return response.data;
};

export const createOrder = async (order: CreateOrderRequest): Promise<OrderResponse> => {
  const response = await apiClient.post<OrderResponse>('/Order', order);
  return response.data;
};

export const getMyOrders = async (): Promise<OrderResponse[]> => {
  const response = await apiClient.get<OrderResponse[]>('/Order/my-orders');
  return response.data;
};

export const getMyUnpaidOrders = async (): Promise<MyUnpaidOrdersSummary> => {
  const response = await apiClient.get<MyUnpaidOrdersSummary>('/Order/my/unpaid');
  return response.data;
};

export interface PickupTimeDensity {
  time: string;
  orderCount: number;
}

export const getPickupTimeDensity = async (): Promise<PickupTimeDensity[]> => {
  const response = await apiClient.get<PickupTimeDensity[]>('/orders/pickup-density');
  return response.data;
};
