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

    // 🔍 LOG TEMPORAL - Ver alertas disponibles
    console.log("========== ALERTAS DISPONIBLES ==========");
    console.log("Total alertas:", data.length);
    data.forEach((alert, idx) => {
      console.log(`\n[${idx + 1}] ID: ${alert.id} | Level: ${alert.level} | Title: ${alert.title}`);
      console.log(`    Short: ${alert.short?.substring(0, 80)}...`);
    });
    console.log("=========================================\n");

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
