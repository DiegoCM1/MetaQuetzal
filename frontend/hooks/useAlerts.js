import useSWR from "swr";
import { track } from "../utils/analytics";

const API_URL = "https://metaquetzal-production.up.railway.app";

const fetcher = async () => {
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
      error: String(e?.message || e),
    });
    throw e;
  }
};

export default function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR("alerts", fetcher, {
    refreshInterval: 60000,
  });

  return { data, error, isLoading, mutate };
}
