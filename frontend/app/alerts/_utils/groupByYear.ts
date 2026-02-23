import type { Alert, AlertsByYear } from "../_types";

/**
 * Groups alerts by year, sorted with most recent first
 */
export function groupAlertsByYear(alerts: Alert[]): AlertsByYear {
  const grouped: AlertsByYear = {};

  alerts.forEach((alert) => {
    const year = new Date(alert.timestamp).getFullYear();
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push(alert);
  });

  // Sort alerts within each year (most recent first)
  Object.keys(grouped).forEach((year) => {
    grouped[Number(year)].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  return grouped;
}

/**
 * Get sorted years from grouped alerts (most recent first)
 */
export function getSortedYears(alertsByYear: AlertsByYear): number[] {
  return Object.keys(alertsByYear)
    .map(Number)
    .sort((a, b) => b - a);
}
