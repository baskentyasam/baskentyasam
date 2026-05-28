import apiClient from "../api/axios";

export interface ActiveLibraryArea {
  id: number;
  name: string;
  location?: string | null;
  capacity: number;
  currentOccupancy: number;
  availableSlots: number;
}

export const getActiveLibraryAreas = async (): Promise<ActiveLibraryArea[]> => {
  const response = await apiClient.get<ActiveLibraryArea[]>("/library-areas/active");
  return response.data;
};

export const getLibraryAreaById = async (
  id: number,
  areas?: ActiveLibraryArea[],
): Promise<ActiveLibraryArea | null> => {
  const list = areas ?? (await getActiveLibraryAreas());
  return list.find((a) => a.id === id) ?? null;
};

export function getAvailableSlots(area: ActiveLibraryArea): number {
  if (area.availableSlots != null && area.availableSlots >= 0) {
    return area.availableSlots;
  }
  return Math.max(0, area.capacity - area.currentOccupancy);
}

export function getOccupancyRate(area: ActiveLibraryArea): number {
  if (area.capacity <= 0) return 0;
  const rate = Math.round((area.currentOccupancy / area.capacity) * 100);
  return Math.min(100, Math.max(0, rate));
}
