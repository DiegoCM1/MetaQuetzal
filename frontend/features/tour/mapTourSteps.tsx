import { Platform } from "react-native";
import type { TourStep } from "react-native-spotlight-tour";

import { TourBox, TourStrong } from "./TourBox";

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
        body={
          <>
            Envía tu ubicación a tus contactos SOS con un toque. Úsalo si estás
            en peligro; incluso si no hay señal, se enviará en cuanto vuelva la
            conexión. Ve a la sección{" "}
            <TourStrong>Más → Contactos SOS</TourStrong> para agregar contactos.
          </>
        }
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
        title="Asistente de emergencia"
        // The offline model is Android-only this release, and its entry point in
        // Ajustes is hidden on iOS (see SettingsScreen). Sending an iPhone user
        // there would point them at a card that isn't rendered — so the copy has
        // to stop promising a capability that platform doesn't have. Drop this
        // branch when iOS parity ships.
        body={
          Platform.OS === "ios" ? (
            <>
              Pregúntale qué hacer antes, durante y después de un huracán.
              Necesita conexión a internet para responder.
            </>
          ) : (
            <>
              Pregúntale qué hacer antes, durante y después de un huracán.
              Responde en línea por defecto; para que también funcione sin
              internet, actívalo en la sección{" "}
              <TourStrong>Más → Ajustes</TourStrong>.
            </>
          )
        }
      />
    ),
  },
  {
    shape: { type: "rectangle", padding: 4 },
    placement: "top",
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Alertas oficiales"
        body="Avisos de huracánes del SMN y el historial de tu zona. Entra cuando quieras confirmar una alerta o ver el detalle completo."
      />
    ),
  },
  {
    shape: { type: "circle", padding: 12 },
    // "top", not "left". This FAB is anchored `right: 16` and is 48 wide, so a
    // tooltip placed beside it gets `screenWidth - 64` to live in — under 300
    // on a common phone, less than the bubble's own width. `shift` cannot
    // rescue an element that is wider than the space it has, so it rendered
    // half off the left edge. Above the FAB it has the whole screen to shift
    // within, which is exactly why every other step already uses "top".
    placement: "top",
    render: (props) => (
      <TourBox
        {...props}
        total={TOTAL}
        title="Reporta lo que ves"
        body="Inundaciones, bloqueos, peligros o puntos de ayuda. Repórtalo en cuanto lo veas: aparece en el mapa de quienes están cerca de ti."
      />
    ),
  },
];
