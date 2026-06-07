import apiClient from "../api/axios";

export interface LibraryFloor {
  id: number;
  code: string;
  name: string;
  maxCapacity: number;
  isOpen: boolean;
  sortOrder: number;
}

export type LibraryScheduleMode = "manual" | "normal" | "exam";

export interface LibraryOccupancySnapshot {
  currentOccupancy: number;
  openCapacity: number;
  availableSlots: number;
  occupancyRate: number;
  lastUpdatedAt?: string | null;
  scheduleMode?: LibraryScheduleMode;
  scheduleDescription?: string;
  floors: LibraryFloor[];
}

/** Geriye dönük uyumluluk */
export interface ActiveLibraryArea {
  id: number;
  name: string;
  location?: string | null;
  capacity: number;
  currentOccupancy: number;
  availableSlots: number;
}

export const getLibraryOccupancy = async (): Promise<LibraryOccupancySnapshot> => {
  const response = await apiClient.get<LibraryOccupancySnapshot>("/library/occupancy");
  return response.data;
};

export const getActiveLibraryAreas = async (): Promise<ActiveLibraryArea[]> => {
  const response = await apiClient.get<ActiveLibraryArea[]>("/library-areas/active");
  return response.data;
};

export function getOpenFloors(snapshot: LibraryOccupancySnapshot): LibraryFloor[] {
  return snapshot.floors.filter((f) => f.isOpen);
}

export function getAvailableSlots(snapshot: LibraryOccupancySnapshot): number {
  if (snapshot.availableSlots != null && snapshot.availableSlots >= 0) {
    return snapshot.availableSlots;
  }
  return Math.max(0, snapshot.openCapacity - snapshot.currentOccupancy);
}

export function getOccupancyRate(snapshot: LibraryOccupancySnapshot): number {
  if (snapshot.occupancyRate != null) {
    return Math.min(100, Math.max(0, snapshot.occupancyRate));
  }
  if (snapshot.openCapacity <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((snapshot.currentOccupancy / snapshot.openCapacity) * 100)),
  );
}
