import apiClient from '../api/axios';

export interface ActiveParkingLot {
  id: number;
  name: string;
  location?: string | null;
  capacity: number;
  currentOccupancy: number;
  availableSlots: number;
}

export const getActiveParkingLots = async (): Promise<ActiveParkingLot[]> => {
  const response = await apiClient.get<ActiveParkingLot[]>('/parking-lots/active');
  return response.data;
};

export const getParkingLotById = async (
  id: number,
  lots?: ActiveParkingLot[],
): Promise<ActiveParkingLot | null> => {
  const list = lots ?? (await getActiveParkingLots());
  return list.find((p) => p.id === id) ?? null;
};

export function getAvailableSlots(lot: ActiveParkingLot): number {
  if (lot.availableSlots != null && lot.availableSlots >= 0) {
    return lot.availableSlots;
  }
  return Math.max(0, lot.capacity - lot.currentOccupancy);
}

export function getOccupancyRate(lot: ActiveParkingLot): number {
  if (lot.capacity <= 0) return 0;
  const rate = Math.round((lot.currentOccupancy / lot.capacity) * 100);
  return Math.min(100, Math.max(0, rate));
}
