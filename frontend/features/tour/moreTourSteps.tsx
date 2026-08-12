import type { TourStep } from "react-native-spotlight-tour";

import { TourBox } from "./TourBox";

/**
 * Tutorial 2 — MoreScreen. Fires on first visit, gated on Tutorial 1 being
 * finished or dismissed so a fast explorer never gets both stacked.
 *
 * Two steps, not three. "Feedback" and "Ajustes" say what they are from their
 * label and icon; spending a step on either would sit a housekeeping item next
 * to two life-safety messages and teach users the bubbles aren't worth reading.
 *
 * Order must match the `MORE_TOUR` constants in `constants.ts`, and every step
 * needs a matching anchor on screen — `MoreScreen` asserts that in dev.
 */

const TOTAL = 2;

export const moreTourSteps: TourStep[] = [
  {
    shape: { type: "rectangle", padding: 6 },
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Chat sin internet"
        body="Se conecta directo con teléfonos cercanos que tengan Bluai, sin red ni datos. Úsalo cuando se caiga la señal y necesites coordinarte con quien esté alrededor."
      />
    ),
  },
  {
    shape: { type: "rectangle", padding: 6 },
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Contactos SOS"
        body="Son quienes reciben tu ubicación cuando usas el botón de emergencia. Configúralos ahora: en plena tormenta no vas a tener tiempo."
      />
    ),
  },
];
