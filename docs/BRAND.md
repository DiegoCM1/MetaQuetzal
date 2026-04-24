# BLUAI — Brand & Design System

> Source of truth for colors, typography, components, and usage rules.
> Anything marked TODO needs confirmation from the design director.

---

## Colors: Theme.ts and tailwind.config.js

### Primary Palette
| Token | Hex | Use |
|---|---|---|
| `brand-blue` | `#3167ff` | CTAs, active tab, interactive elements |
| `brand-indigo` | `#3900ff` | Deep accent, gradients |
| `brand-cyan` | `#2ecaff` | Highlights, map accents |
| `brand-black` | `#000000` | True black, rarely used directly |

### Secondary Palette
| Token | Hex | Use |
|---|---|---|
| `brand-purple` | `#9200ff` | Alert hints, subtitle text, advisory alerts |
| `brand-orange` | `#ff8500` | Warning-level alerts |
| `brand-yellow` | `#ffce00` | Watch-level alerts |
| `brand-green` | `#00e774` | Safe/clear status markers |
| `brand-red` | `#e24337` | Emergency/zona roja |
| `brand-teal` | `#4ed5de` | Map elements, secondary icons |

### Alert Severity → Color Mapping
| Level | Color | Token |
|---|---|---|
| Safe / Clear | Green | `brand-green` |
| Watch | Yellow | `brand-yellow` |
| Advisory | Purple | `brand-purple` |
| Warning | Orange | `brand-orange` |
| Emergency | Red | `brand-red` |

---

## Theming Convention

**Always use `useTheme` from `context/ThemeContext`** to read `colorScheme` imperatively (icon colors, inline styles, switch colors).

Never use `useColorScheme` from NativeWind or React Native directly — they bypass AsyncStorage persistence.

```tsx
// ✅ correct
import { useTheme } from "../context/ThemeContext"
const { colorScheme } = useTheme()

// ❌ wrong
import { useColorScheme } from "nativewind"
import { useColorScheme } from "react-native"
```

NativeWind's `dark:` class prefix works automatically — no hook needed for that.

---

## Gradients

Defined in `utils/theme.ts`. Use with `expo-linear-gradient`.

| Key | Description | Status |
|---|---|---|
| `primary` | Dark navy — default app background | Final |
| `morado` | Purple-tinted dark |
| `naranja` | Orange-tinted dark |
| `verde` | Green-tinted dark |
| `header` | blue-tinted dark |


---

## Typography

Fonts loaded via `expo-font` in `app/_layout.tsx`. Registered in `tailwind.config.js`.

| Font | Tailwind class | Use |
|---|---|---|
| Square721 | `font-square721` | App name, hero titles |
| Poppins-Light | `font-poppins` | Body text, labels, descriptions |
| Poppins-SemiBold | `font-poppins-semibold` | Section titles, button labels, emphasis |

### Scale (approximate from mockup)
| Role | Size | Weight | Color |
|---|---|---|---|
| Screen title | `text-2xl` | SemiBold | white |
| Section label | `text-lg` | SemiBold | white |
| Body | `text-sm` | Light | white |
| Hint / accent | `text-xs` | Light | `brand-purple` |
| CTA button | `text-base` | SemiBold uppercase | white |

---

## Components

Shared components live in `components/`. Build these before individual screens.

### BottomTabBar
- Pill-shaped dark container, full width
- 4 tabs: Mapa, Chat, Alertas, Más 
- Bluai logo button on far right (circular, elevated)
- Active tab highlighted in `brand-blue`
- Present on every main screen

### SectionHeader
- Left-anchored blue rounded tab
- White bold text inside
- Used on: Alertas, Ajustes, Suscripción, Perfil, Preferencias

### DarkCard
- Background: dark navy (`~#0a1c32`)
- Rounded corners: `rounded-2xl`
- Used for content containers in: onboarding, alerts, settings, subscription

### CTAButton
- Full width, `rounded-full`
- Background: `brand-blue`
- Text: white, uppercase, `font-poppins-semibold`
- Used everywhere there is a primary action (GUARDAR, OBTENER PLAN, etc.)

### AlertMarker (map)
- Triangle shape with icon inside
- Color driven by alert severity (see severity → color mapping above)
- Variants: green shield (safe), teal triangle (advisory), orange triangle (warning), purple triangle (watch)

---

## Screen Inventory

| Screen | Route | Status | Notes |
|---|---|---|---|
| Splash | `app/index.jsx` | Built | Routes based on onboarding flag |
| Login | `app/(auth)/index.tsx` | Styled | Background PNG, logo, Google button |
| Map | `app/(tabs)/MapScreen` | Needs styling | Dark map tiles, alert markers |
| Zone alert popup | — | Needs styling | Modal on map tap |
| Alert detail | `app/alerts/[id]` | Needs styling | Hurricane detail view |
| Onboarding Step 1 | `app/onboarding/step1` | Needs styling | Perfil — personal data form |
| Onboarding Step 2 | `app/onboarding/step2` | Needs styling | Preferencias — sliders |
| Settings | `app/SettingsScreen` | Needs styling | Toggles + nav rows |
| Subscription | — | Not built | Suscripción screen |
| Profile | — | TODO | May overlap with onboarding step 1 |
