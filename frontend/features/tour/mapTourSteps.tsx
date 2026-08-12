import type { TourStep } from "react-native-spotlight-tour";

import { TourBox } from "./TourBox";

/**
 * Tutorial 1 — MapScreen. Passive: every step is read-and-tap-next.
 *
 * Content lives here and nowhere else, so rewording never touches layout. Order
 * must match the `MAP_TOUR` constants in `constants.ts`.
 *
 * NOTE: every step must have a matching `AttachStep` on screen. A step without
 * one renders an *invisible* tooltip (the spot starts zero-sized and only
 * `AttachStep` changes it) and silently inherits the previous step's spotlight.
 * That's why the intro is a plain modal (`TourIntroCard`) rather than a step.
 */

const TOTAL = 4;

export const mapTourSteps: TourStep[] = [
  {
    // Circle, and deliberately first: it's the most safety-critical content,
    // it costs the user nothing, and it hands off to Tutorial 2.
    shape: { type: "circle", padding: 12 },
    // Explicit "top": this FAB sits at the bottom-left of the screen, so the
    // default "bottom" placement would put the tooltip off-screen and rely on
    // flip to rescue it.
    placement: "top",
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Botón de emergencia"
        body="Avisa a tus contactos dónde estás. No lo presiones ahora — solo queremos que sepas dónde está."
        warning="⚠️ Aún no tienes contactos configurados. Ve a Más → Contactos SOS para agregarlos."
      />
    ),
  },
  {
    // Still one step, but aimed at the IA tab alone rather than the whole bar.
    // Mapa / Alertas / Más are self-evident from their labels; only IA has a
    // property you can't guess — which is what makes it the only tab worth a
    // step, and equally the only one worth lighting up. A cutout around all
    // four leaves the user matching this copy against four buttons.
    //
    // Padding is small on purpose: the tabs are flex:1 siblings with no gap
    // between them, so anything generous here bleeds into the neighbours and
    // gives back the ambiguity the narrower target just removed.
    shape: { type: "rectangle", padding: 4 },
    placement: "top",
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="La IA funciona sin internet"
        body="El asistente vive en tu teléfono. Si te quedas sin señal durante un huracán, sigue respondiendo."
      />
    ),
  },
  {
    // Same treatment as the IA tab, one cell to the right — see the padding
    // note above; these two are siblings in the same bar and share the reason
    // for hugging their target tightly.
    shape: { type: "rectangle", padding: 4 },
    placement: "top",
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Alertas oficiales"
        body="Avisos de ciclón del SMN y el historial de tu zona. Cuando algo cambia, aquí está el detalle completo."
      />
    ),
  },
  {
    shape: { type: "circle", padding: 12 },
    placement: "left",
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Reporta lo que ves"
        body="Inundaciones, bloqueos, peligros o puntos de ayuda. Lo que reportas aparece en el mapa de quienes están cerca de ti."
      />
    ),
  },
];
