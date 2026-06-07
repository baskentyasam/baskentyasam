import { HourlyPoint } from "../components/OccupancyCharts";

type HistoryEntry = {
  hour: number;
  rate: number;
  recordedAt: number;
};

const MAX_ENTRIES = 72;

export function trackOccupancyHistory(storageKey: string, rate: number): HourlyPoint[] {
  if (typeof window === "undefined") {
    return [{ hour: new Date().getHours(), rate }];
  }

  const hour = new Date().getHours();
  let history: HistoryEntry[] = [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    history = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    history = [];
  }

  const last = history[history.length - 1];
  if (!last || last.hour !== hour || last.rate !== rate) {
    history.push({ hour, rate, recordedAt: Date.now() });
  }

  if (history.length > MAX_ENTRIES) {
    history = history.slice(-MAX_ENTRIES);
  }

  window.localStorage.setItem(storageKey, JSON.stringify(history));

  const byHour = new Map<number, number>();
  for (const entry of history) {
    byHour.set(entry.hour, entry.rate);
  }

  const startHour = 8;
  const endHour = 20;
  const points: HourlyPoint[] = [];
  for (let h = startHour; h <= endHour; h += 1) {
    points.push({
      hour: h,
      rate: byHour.get(h) ?? (h === hour ? rate : 0),
    });
  }

  return points;
}

export function buildCompareRates<T extends { name: string; capacity: number; currentOccupancy: number }>(
  items: T[],
): { name: string; rate: number }[] {
  return items.map((item) => ({
    name: item.name,
    rate:
      item.capacity > 0
        ? Math.round((item.currentOccupancy / item.capacity) * 100)
        : 0,
  }));
}
