import React, { useEffect, useMemo, useState } from "react";
import { OccupancySeriesPoint, occupancyService } from "../services/occupancyService";

type Props = {
  zoneName: string;
  title?: string;
};

type Period = { label: string; hours: number; bucketMinutes: number };

const PERIODS: Period[] = [
  { label: "1 saat", hours: 1, bucketMinutes: 1 },
  { label: "6 saat", hours: 6, bucketMinutes: 5 },
  { label: "24 saat", hours: 24, bucketMinutes: 15 },
  { label: "7 gün", hours: 168, bucketMinutes: 60 },
];

const OccupancyChart: React.FC<Props> = ({ zoneName, title }) => {
  const [period, setPeriod] = useState<Period>(PERIODS[2]);
  const [data, setData] = useState<OccupancySeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    occupancyService
      .series(zoneName, period.hours, period.bucketMinutes)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.response?.data?.message || "Veri çekilemedi.");
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [zoneName, period]);

  const stats = useMemo(() => {
    if (data.length === 0) return { current: 0, max: 0, avg: 0 };
    const current = data[data.length - 1]?.avg ?? 0;
    const max = data.reduce((m, p) => Math.max(m, p.max), 0);
    const avgSum = data.reduce((s, p) => s + p.avg, 0);
    return { current, max, avg: Math.round(avgSum / data.length) };
  }, [data]);

  const maxCapacity = useMemo(() => {
    if (data.length === 0) return 100;
    return Math.max(1, ...data.map((d) => Math.max(d.capacity, d.max)));
  }, [data]);

  // SVG chart - 400 wide, 160 tall
  const W = 800;
  const H = 200;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = useMemo(() => {
    if (data.length === 0) return "";
    const minT = new Date(data[0].t).getTime();
    const maxT = new Date(data[data.length - 1].t).getTime();
    const range = Math.max(1, maxT - minT);
    return data
      .map((p) => {
        const t = new Date(p.t).getTime();
        const x = padL + ((t - minT) / range) * chartW;
        const y = padT + chartH - (p.avg / maxCapacity) * chartH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, maxCapacity, chartW, chartH]);

  const tickLabels = useMemo(() => {
    if (data.length === 0) return [];
    const n = Math.min(5, data.length);
    const step = Math.max(1, Math.floor(data.length / n));
    const out = [] as { x: number; label: string }[];
    const minT = new Date(data[0].t).getTime();
    const maxT = new Date(data[data.length - 1].t).getTime();
    const range = Math.max(1, maxT - minT);
    for (let i = 0; i < data.length; i += step) {
      const t = new Date(data[i].t).getTime();
      const x = padL + ((t - minT) / range) * chartW;
      const d = new Date(data[i].t);
      const label =
        period.hours <= 24
          ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      out.push({ x, label });
    }
    return out;
  }, [data, period, chartW]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">
          {title || "Doluluk Grafiği"} <span className="ml-2 text-xs text-slate-500">{zoneName}</span>
        </h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              className={`rounded px-2 py-1 text-xs ${
                period.label === p.label
                  ? "bg-[#d71920] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Anlık" value={stats.current} />
        <Stat label="Ortalama" value={stats.avg} />
        <Stat label="En yüksek" value={stats.max} />
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Yükleniyor...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            Bu zaman aralığında veri yok.
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full">
            <rect
              x={padL}
              y={padT}
              width={chartW}
              height={chartH}
              fill="#f8fafc"
            />
            {/* Y grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1={padL}
                x2={padL + chartW}
                y1={padT + chartH - p * chartH}
                y2={padT + chartH - p * chartH}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            ))}
            {/* Y labels */}
            {[0, 0.5, 1].map((p) => (
              <text
                key={p}
                x={padL - 6}
                y={padT + chartH - p * chartH + 3}
                textAnchor="end"
                className="fill-slate-500"
                style={{ fontSize: 10 }}
              >
                {Math.round(maxCapacity * p)}
              </text>
            ))}
            {/* Polyline */}
            <polyline
              points={points}
              fill="none"
              stroke="#d71920"
              strokeWidth={2}
            />
            {/* X labels */}
            {tickLabels.map((t, i) => (
              <text
                key={i}
                x={t.x}
                y={H - 6}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: 10 }}
              >
                {t.label}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-md bg-slate-50 p-2">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
  </div>
);

export default OccupancyChart;
