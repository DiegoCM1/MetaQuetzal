/**
 * Shared types for the alerts module
 */

export interface Alert {
  id: string;
  level: number;
  title: string;
  short?: string;
  timestamp: string;
  score?: number;
  recommendations?: string[];
  factors?: string[];
}

export interface AlertsByYear {
  [year: number]: Alert[];
}
