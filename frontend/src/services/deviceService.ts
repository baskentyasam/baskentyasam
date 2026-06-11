import apiClient from "../api/axios";

export type LocationType = "library" | "parking" | "cafeteria";

export interface DeviceRoi {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DeviceListItem {
  id: string;
  name: string;
  locationType: LocationType;
  locationKey?: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt?: string | null;
  configVersion: number;
}

export interface DeviceConfig {
  line: number[]; // [x1,y1,x2,y2]
  mode: "person" | "vehicle";
  flipDirection: boolean;
  roi?: DeviceRoi | null;
  configVersion: number;
  snapshotRequested: boolean;
}

export interface DeviceDetail {
  device: DeviceListItem;
  config: DeviceConfig;
  latestSnapshotAt?: string | null;
}

export interface DeviceConfigUpdate {
  line: number[];
  mode: "person" | "vehicle";
  flipDirection: boolean;
  roi?: DeviceRoi | null;
}

export interface CreateDeviceInput {
  id: string;
  name: string;
  locationType: LocationType;
  locationKey?: string | null;
}

export interface CreateDeviceResult {
  device: DeviceListItem;
  plainToken: string;
}

export const deviceService = {
  list: async (): Promise<DeviceListItem[]> => {
    const r = await apiClient.get<DeviceListItem[]>("/admin/devices");
    return r.data;
  },

  get: async (id: string): Promise<DeviceDetail> => {
    const r = await apiClient.get<DeviceDetail>(`/admin/devices/${encodeURIComponent(id)}`);
    return r.data;
  },

  create: async (input: CreateDeviceInput): Promise<CreateDeviceResult> => {
    const r = await apiClient.post<CreateDeviceResult>("/admin/devices", input);
    return r.data;
  },

  updateConfig: async (id: string, cfg: DeviceConfigUpdate): Promise<DeviceConfig> => {
    const r = await apiClient.post<DeviceConfig>(
      `/admin/devices/${encodeURIComponent(id)}/config`,
      cfg,
    );
    return r.data;
  },

  requestSnapshot: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/devices/${encodeURIComponent(id)}/snapshot/request`);
  },

  // Snapshot binary olarak indirir, blob URL döner
  getSnapshotUrl: async (id: string): Promise<string | null> => {
    try {
      const r = await apiClient.get(`/admin/devices/${encodeURIComponent(id)}/snapshot`, {
        responseType: "blob",
      });
      return URL.createObjectURL(r.data as Blob);
    } catch {
      return null;
    }
  },
};
