import type { TOUR_IDS } from "./constants";

/** Which tutorial. One key per tour in AsyncStorage. */
export type TourId = (typeof TOUR_IDS)[keyof typeof TOUR_IDS];
