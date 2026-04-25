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
  const url = `${API_BASE_URL}/api/v1/alerts?limit=50`
  try {
    const res = await authFetch(url);
    if (!res.ok) {
      const body = await res.text()
      console.error(`[Alerts] HTTP ${res.status} | url: ${url} | body: ${body}`)
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json();
    track("alerts_fetch_success", {
      duration_mws: Date.now() - start,
      list_count: Array.isArray(data) ? data.length : 0,
    });
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const isAuthError = msg === 'Not authenticated'
    console.error(`[Alerts] fetch failed | stage: ${isAuthError ? 'token' : 'request'} | url: ${url} | error: ${msg}`)
    track("alerts_fetch_error", {
      duration_ms: Date.now() - start,
      error: msg,
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
