import apiClient from "../api/axios";

export interface OccupancyLogPoint {
  logTime: string; // ISO
  count: number;
  capacity: number;
}

export interface OccupancySeriesPoint {
  t: string; // ISO bucket start
  avg: number;
  max: number;
  capacity: number;
}

export const occupancyService = {
  recent: async (zoneName: string, hours: number = 24): Promise<OccupancyLogPoint[]> => {
    const r = await apiClient.get<OccupancyLogPoint[]>(
      `/occupancy/${encodeURIComponent(zoneName)}`,
      { params: { hours } },
    );
    return r.data;
  },

  series: async (
    zoneName: string,
    hours: number = 24,
    bucketMinutes: number = 15,
  ): Promise<OccupancySeriesPoint[]> => {
    const r = await apiClient.get<OccupancySeriesPoint[]>(
      `/occupancy/${encodeURIComponent(zoneName)}/series`,
      { params: { hours, bucketMinutes } },
    );
    return r.data;
  },
};
