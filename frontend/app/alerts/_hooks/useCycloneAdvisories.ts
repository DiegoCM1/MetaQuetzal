import useSWR from "swr";
import { authFetch } from "../../../utils/api";
import { useAuth } from "../../../features/auth/AuthContext";
import { API_BASE_URL } from "../../../utils/config";
import type { SMNCycloneAdvisory } from "../_types";

const fetcher = async (): Promise<SMNCycloneAdvisory[]> => {
  const url = `${API_BASE_URL}/api/v1/alerts/active`;
  const res = await authFetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[CycloneAdvisories] HTTP ${res.status} | url: ${url} | body: ${body}`,
    );
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.smn_cyclone_advisories ?? [];
};

/**
 * Structured SMN cyclone advisories (Atlántico/Pacífico) from /alerts/active.
 * Separate from useAlerts (which lists the flat /alerts history) — this is
 * specifically the dedicated section for official SMN cyclone data.
 */
export default function useCycloneAdvisories() {
  const { user } = useAuth();
  const { data, error, isLoading } = useSWR<SMNCycloneAdvisory[]>(
    user ? "cyclone-advisories" : null,
    fetcher,
    { refreshInterval: 60000 },
  );

  return { data, error, isLoading };
}
