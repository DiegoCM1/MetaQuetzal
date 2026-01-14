import useSWR from "swr";
import { track } from "../../../utils/analytics";

const API_URL = "https://metaquetzal-production.up.railway.app";

interface Alert {
  id: string;
  level: number;
  title: string;
  short?: string;
  timestamp: string;
  score?: number;
  recommendations?: string[];
  factors?: string[];
}

const fetcher = async (): Promise<Alert[]> => {
  const start = Date.now();
  track("alerts_fetch_start");
  try {
    const res = await fetch(`${API_URL}/alerts?limit=50`);
    if (!res.ok) throw new Error("Error fetching alerts");
    const data = await res.json();

    track("alerts_fetch_success", {
      duration_ms: Date.now() - start,
      list_count: Array.isArray(data) ? data.length : 0,
    });
    return data;
  } catch (e) {
    track("alerts_fetch_error", {
      duration_ms: Date.now() - start,
      error: String(e instanceof Error ? e.message : e),
    });
    throw e;
  }
};

export default function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR<Alert[]>("alerts", fetcher, {
    refreshInterval: 60000,
  });

  return { data, error, isLoading, mutate };
}
