import useSWR from "swr";
import { track } from "../../../utils/analytics";
import { authFetch } from '../../../utils/api'
import { useAuth } from '../../(auth)/_context/AuthContext'
import { API_BASE_URL } from '../../../utils/config'

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
  console.log('[Alerts] fetching...')
  try {
    const res = await authFetch(`${API_BASE_URL}/api/v1/alerts?limit=50`);
    console.log('[Alerts] response status:', res.status)
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    track("alerts_fetch_success", {
      duration_mws: Date.now() - start,
      list_count: Array.isArray(data) ? data.length : 0,
    });
    return data;
  } catch (e) {
    console.error('[Alerts] fetch error:', e)
    track("alerts_fetch_error", {
      duration_ms: Date.now() - start,
      error: String(e instanceof Error ? e.message : e),
    });
    throw e;
  }
};

export default function useAlerts() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<Alert[]>(user ? "alerts" : null, fetcher, {
    refreshInterval: 60000,
  });

  return { data, error, isLoading, mutate };
}
