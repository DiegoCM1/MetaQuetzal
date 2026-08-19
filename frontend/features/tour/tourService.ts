import AsyncStorage from "@react-native-async-storage/async-storage";

import { TOUR_IDS, TOUR_STORAGE_KEYS } from "./constants";
import { tourLog, tourWarn } from "./tourLog";
import type { TourId } from "./types";

/**
 * Persistence for "has this tutorial been shown". Mirrors the shape of
 * `app/onboarding/_services/onboardingService.ts` — same storage, same
 * fail-soft posture.
 *
 * Every read defaults to `true` (already seen) on error. A tutorial that fails
 * to appear is a non-event; one that reappears on every launch because a read
 * threw is a bug the user cannot escape.
 */

export const hasSeenTour = async (tour: TourId): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(TOUR_STORAGE_KEYS[tour]);
    tourLog(`read ${TOUR_STORAGE_KEYS[tour]} = ${value ?? "(unset)"}`);
    return value === "true";
  } catch (error) {
    tourWarn(`could not read the "${tour}" flag, assuming SEEN:`, error);
    return true;
  }
};

export const markTourSeen = async (tour: TourId): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOUR_STORAGE_KEYS[tour], "true");
    tourLog(`wrote ${TOUR_STORAGE_KEYS[tour]} = true`);
  } catch (error) {
    tourWarn(`could not save the "${tour}" flag:`, error);
  }
};

/**
 * Tutorial 2 only runs once Tutorial 1 is done or dismissed, so a fast explorer
 * who taps "Más" seconds after onboarding doesn't get both tours stacked.
 */
export const shouldRunMoreTour = async (): Promise<boolean> => {
  const [mapSeen, moreSeen] = await Promise.all([
    hasSeenTour(TOUR_IDS.map),
    hasSeenTour(TOUR_IDS.more),
  ]);
  return mapSeen && !moreSeen;
};

/** Backs the "Ver tutorial de nuevo" entry in Ajustes. */
export const resetAllTours = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(Object.values(TOUR_STORAGE_KEYS));
    tourLog(
      "🔄 reset all tour flags — next map focus should re-run Tutorial 1",
    );
  } catch (error) {
    tourWarn("could not reset tour flags:", error);
    throw error;
  }
};
