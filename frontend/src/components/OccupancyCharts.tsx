import React from "react";

export type HourlyPoint = {
  hour: number;
  rate: number;
};

type Props = {
  title: string;
  hourly: HourlyPoint[];
  compareItems: { name: string; rate: number }[];
};

const formatHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export const OccupancyCharts: React.FC<Props> = ({ title, hourly, compareItems }) => {
  const maxRate = Math.max(100, ...hourly.map((h) => h.rate), ...compareItems.map((i) => i.rate));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">{title} — saatlik doluluk (%)</p>
        {hourly.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz saatlik veri yok.</p>
        ) : (
          <div className="flex items-end gap-2 h-44 overflow-x-auto pb-2">
            {hourly.map((point) => (
              <div key={point.hour} className="flex flex-col items-center min-w-[42px]">
                <span className="text-[10px] text-slate-500 mb-1">%{point.rate}</span>
                <div className="w-8 bg-slate-100 rounded-t-md flex items-end h-28">
                  <div
                    className="w-full rounded-t-md bg-[#d71920] transition-all duration-500"
                    style={{ height: `${Math.max(4, (point.rate / maxRate) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 mt-2">{formatHour(point.hour)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {compareItems.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Alan karşılaştırması (%)</p>
          <div className="space-y-3">
            {compareItems.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="font-semibold">%{item.rate}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#d71920] transition-all duration-500"
                    style={{ width: `${Math.max(2, item.rate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OccupancyCharts;
