import { useCallback, useEffect, useRef, useState } from "react";

const CHECK_INTERVAL_MS = 5000;

export function useLiveOccupancyFeed<T>(load: () => Promise<T>, serialize: (data: T) => string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Veri bekleniyor...");
  const snapshotRef = useRef<string>("");

  const refresh = useCallback(async () => {
    try {
      const next = await load();
      const nextKey = serialize(next);
      if (nextKey !== snapshotRef.current) {
        snapshotRef.current = nextKey;
        setData(next);
        setLastUpdated(
          `${new Date().toLocaleDateString("tr-TR")}, ${new Date().toLocaleTimeString("tr-TR")}`,
        );
      }
      setError(null);
    } catch {
      setError("Veri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [load, serialize]);

  useEffect(() => {
    void refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      void refresh();
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { data, loading, error, lastUpdated, refresh };
}
