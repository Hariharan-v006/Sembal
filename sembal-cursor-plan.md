# Sembal – Blood Response Network
## Cursor AI Development Plan (Phase 1) — Full Specification

---

## Project Overview

**App Name:** Sembal
**Tagline:** "Every second counts. Every donor matters."
**Type:** React Native mobile app (Expo)
**Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
**Phase 1 Scope:** Authentication, User Profile, Eligibility Checker, Blood Request System, Location Features, Donor Response, SOS Emergency System, Notification System, Donation History, Organ Donation, UI/UX

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Framework | React Native with Expo (SDK 51+) |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based routing) |
| Backend / DB | Supabase |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase Realtime |
| Push Notifications | Expo Notifications + Supabase Edge Functions |
| Location | expo-location |
| State Management | Zustand |
| Forms | react-hook-form + zod |
| Styling | NativeWind (TailwindCSS for React Native) |
| Icons | @expo/vector-icons (Ionicons) |
| HTTP Client | Supabase JS client (auto-generated types) |

---

## Package Installation

```bash
npx create-expo-app sembal --template blank-typescript
cd sembal
npx expo install expo-location expo-notifications expo-image-picker
npm install @supabase/supabase-js zustand react-hook-form zod @hookform/resolvers
npm install nativewind tailwindcss
npm install @expo/vector-icons
npx expo install expo-router react-native-safe-area-context react-native-screens
npm install @react-native-async-storage/async-storage
npm install react-native-url-polyfill
npx expo install expo-linear-gradient
npm install react-native-reanimated
```

---

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Project Structure

```
sembal/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home / blood requests feed
│   │   ├── sos.tsx               # SOS screen
│   │   ├── history.tsx           # Donation history
│   │   ├── profile.tsx           # User profile
│   │   └── _layout.tsx           # Tab bar layout
│   ├── requests/
│   │   ├── [id].tsx              # Request detail
│   │   └── create.tsx            # Create request
│   ├── eligibility/
│   │   └── index.tsx             # Eligibility checker
│   ├── notifications/
│   │   └── index.tsx             # Notifications page
│   ├── organ-donation/
│   │   └── index.tsx             # Organ donation consent
│   └── _layout.tsx               # Root layout + auth guard
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx
│   │   └── LoadingSpinner.tsx
│   ├── requests/
│   │   ├── RequestCard.tsx
│   │   ├── RequestFilter.tsx
│   │   └── UrgencyBadge.tsx
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   └── NotificationItem.tsx
│   └── sos/
│       └── SOSButton.tsx
├── lib/
│   ├── supabase.ts
│   ├── types.ts
│   └── utils.ts
├── stores/
│   ├── authStore.ts
│   ├── requestStore.ts
│   └── notificationStore.ts
├── hooks/
│   ├── useLocation.ts
│   ├── useNotifications.ts
│   └── useRealtime.ts
├── constants/
│   └── theme.ts
├── assets/images/
├── app.json
├── package.json
├── tsconfig.json
└── .env
```

---

## Design System & Visual Language

### Brand Identity
Sembal is an emergency-first app. The visual design must communicate urgency, trust, and speed. The interface uses a bold red primary palette against clean white surfaces. Typography is large and readable. Every critical action (SOS, Accept, Create Request) must be visually dominant and finger-friendly (minimum 48px touch targets).

### Color Palette

```typescript
// constants/theme.ts

export const COLORS = {
  // Brand
  primary: '#C0392B',          // Deep red — primary buttons, key actions, SOS
  primaryDark: '#96281B',       // Pressed/active state for primary
  primaryLight: '#E74C3C',      // Lighter red — highlights, active tab indicator
  primarySurface: '#FDEDED',    // Very light red — card backgrounds for critical items

  // Neutrals
  background: '#F5F5F5',        // App background — off-white, not pure white
  surface: '#FFFFFF',           // Card and modal backgrounds
  surfaceAlt: '#FAFAFA',        // Secondary surface (list items, input backgrounds)
  textPrimary: '#1A1A1A',       // Main body text
  textSecondary: '#555555',     // Subtext, labels
  textMuted: '#999999',         // Placeholders, disabled text, timestamps
  border: '#E5E5E5',            // Default border
  borderFocus: '#C0392B',       // Input border on focus
  divider: '#F0F0F0',           // List dividers

  // Urgency system — used consistently across all request cards, badges, and filters
  urgency: {
    normal: '#27AE60',          // Green — routine requests
    normalSurface: '#EAF7EE',   // Green card background tint
    urgent: '#E67E22',          // Orange — same-day needs
    urgentSurface: '#FEF3E6',   // Orange card background tint
    critical: '#C0392B',        // Red — immediate/life-threatening
    criticalSurface: '#FDEDED', // Red card background tint
  },

  // Semantic
  success: '#27AE60',
  successSurface: '#EAF7EE',
  warning: '#F39C12',
  warningSurface: '#FEF9E7',
  error: '#C0392B',
  errorSurface: '#FDEDED',
  info: '#2980B9',
  infoSurface: '#EAF4FB',

  // Eligibility
  eligible: '#27AE60',
  eligibleSurface: '#EAF7EE',
  temporary: '#E67E22',
  temporarySurface: '#FEF3E6',
  notEligible: '#C0392B',
  notEligibleSurface: '#FDEDED',

  // Tab bar
  tabActive: '#C0392B',
  tabInactive: '#AAAAAA',
  tabBackground: '#FFFFFF',
};

export const TYPOGRAPHY = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 38,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, section: 40,
};

export const RADIUS = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ORGANS = [
  'Heart', 'Kidneys', 'Liver', 'Lungs',
  'Pancreas', 'Intestines', 'Corneas', 'Skin', 'Bone Marrow'
];
```

### Global UI Rules
- All screens have `#F5F5F5` background. Exception: auth screens and SOS screen use white and dark backgrounds respectively.
- All primary action buttons: full-width, height 52px, border-radius 10, `#C0392B` background, white text, font weight 600.
- Secondary buttons: full-width, height 52px, border-radius 10, white background, `1px solid #C0392B` border, `#C0392B` text.
- All text inputs: height 52px, `#FAFAFA` background, `1px solid #E5E5E5` border, border-radius 10, font size 15. On focus: border turns `#C0392B`.
- Cards: white background, border-radius 14, shadow (shadowOpacity 0.06), padding 16px.
- Status bar: dark-content on all white screens; light-content only on SOS screen.
- Loading states: centered `ActivityIndicator` with color `#C0392B`.
- Empty states: centered Ionicons icon (gray, 64px) + bold title + muted subtitle + optional CTA button.
- Error messages: red inline text below field OR red toast/snackbar at bottom.
- All touch targets minimum 48×48px for accessibility.
- All timestamps shown using `formatTimeAgo` utility (not raw ISO strings).

---

## Supabase Client Setup

```typescript
// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## TypeScript Types

```typescript
// lib/types.ts

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UrgencyLevel = 'normal' | 'urgent' | 'critical';
export type EligibilityStatus = 'eligible' | 'not_eligible' | 'temporary';
export type RequestStatus = 'open' | 'fulfilled' | 'cancelled' | 'expired';
export type ResponseStatus = 'accepted' | 'declined' | 'pending' | 'completed';
export type NotificationType = 'blood_request' | 'sos' | 'response' | 'system';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  eligibility_status: EligibilityStatus;
  last_donation_date: string | null;
  is_available: boolean;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  blood_group: BloodGroup;
  units_needed: number;
  urgency: UrgencyLevel;
  hospital_name: string;
  hospital_address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  notes: string | null;
  status: RequestStatus;
  is_sos: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  distance?: number; // computed client-side via Haversine
}

export interface DonorResponse {
  id: string;
  request_id: string;
  donor_id: string;
  status: ResponseStatus;
  message: string | null;
  responded_at: string;
  created_at: string;
  request?: BloodRequest;
  donor?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export interface DonationRecord {
  id: string;
  donor_id: string;
  request_id: string | null;
  donation_date: string;
  hospital_name: string;
  units_donated: number;
  notes: string | null;
  created_at: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reason: string;
  eligible_after?: string;
}

export interface OrganDonationConsent {
  id: string;
  user_id: string;
  is_donor: boolean;
  organs: string[];
  consent_date: string;
  updated_at: string;
}

export interface SOSAlert {
  id: string;
  requester_id: string;
  blood_group: BloodGroup;
  latitude: number;
  longitude: number;
  hospital_name: string;
  contact_number: string;
  radius_km: number;
  donors_notified: number;
  created_at: string;
}
```

---

## Utility Functions

```typescript
// lib/utils.ts

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export function getUrgencyLabel(urgency: UrgencyLevel): string {
  return { normal: 'Normal', urgent: 'Urgent', critical: 'Critical' }[urgency];
}

export function getEligibilityLabel(status: EligibilityStatus): string {
  return {
    eligible: 'Eligible to Donate',
    not_eligible: 'Not Eligible',
    temporary: 'Temporarily Ineligible',
  }[status];
}

// Blood group compatibility — which donors can give to a given recipient
export const BLOOD_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};
```

---

## App-Wide Navigation & Auth Guard

### `app/_layout.tsx`
This is the root layout. It listens to Supabase auth session state. Logic flow:
1. On mount, call `supabase.auth.getSession()`.
2. Subscribe to `supabase.auth.onAuthStateChange`.
3. While session check is pending: show splash screen (white background, centered Sembal red droplet logo 80px, "sembal" in 32px bold `#C0392B`, tagline "Blood Response Network" in 14px `#999999`, `ActivityIndicator` at bottom in `#C0392B`).
4. If `session` is null: redirect to `/(auth)/login`.
5. If `session` exists: fetch profile from Supabase, store in `authStore`, redirect to `/(tabs)/`.
6. After session confirmed: call `useNotifications` hook to register push token and save to `profiles.push_token`.

---

## Screen Specifications

---

### SCREEN 1: Register

**File:** `app/(auth)/register.tsx`

**Visual Layout (top to bottom, scroll view, white background):**
- Back arrow (Ionicons `arrow-back`, 24px `#1A1A1A`) top left.
- Heading: "Create Account" — 28px bold `#1A1A1A`.
- Subheading: "Join Sembal and start saving lives" — 15px `#666666`, margin-bottom 32px.
- Form fields with 13px bold `#555555` label above each:
  1. Full Name — text input.
  2. Email — keyboard type email.
  3. Phone Number — keyboard type phone-pad, placeholder "+91 XXXXX XXXXX".
  4. Password — secure text, eye icon toggle on right to show/hide.
  5. Date of Birth — tapping opens a DatePicker modal, displays result as "DD/MM/YYYY".
  6. Gender — 3 horizontal pills: Male / Female / Other. Selected: `#C0392B` bg, white text. Unselected: white bg, `#999999` text, `#E5E5E5` border.
  7. Blood Group — 2×4 grid of pill buttons. Selected: `#C0392B` bg, white bold text. Unselected: white bg, gray border.
  8. City — text input.
  9. State — text input.
- Primary button: "Create Account" — full width, `#C0392B`.
- Below button: "Already have an account? Sign in" (14px `#666666`, "Sign in" in `#C0392B` tappable).

**Logic:**
- Zod validation: email format, password min 8 chars, all fields required, blood group required.
- Call `supabase.auth.signUp({ email, password, options: { data: { full_name, phone, blood_group } } })`.
- Database trigger `handle_new_user` auto-creates the profile row from metadata.
- After signup, update profile with DOB, gender, city, state via `supabase.from('profiles').update(...)` where `id = user.id`.
- Show inline field-level errors on validation fail.
- Show red toast if email already exists.
- Redirect to `/(tabs)/` on success.

---

### SCREEN 2: Login

**File:** `app/(auth)/login.tsx`

**Visual Layout (white background, vertically centered, not scrollable):**
- Centered Sembal droplet logo (60px) + "sembal" in 28px bold `#C0392B`.
- "Welcome back" in 22px bold `#1A1A1A`, "Sign in to continue" in 14px `#666666`.
- Email field, Password field (secure with eye toggle).
- "Forgot password?" — 13px `#C0392B`, right-aligned.
- "Sign In" primary button (shows `ActivityIndicator` inside while loading, button disabled).
- Thin `#E5E5E5` divider with centered "or" text.
- "Don't have an account? Register" — "Register" in `#C0392B`.

**Logic:**
- Zod validation: valid email, non-empty password.
- Call `supabase.auth.signInWithPassword({ email, password })`.
- On success: store session + profile in Zustand, redirect to `/(tabs)/`.
- On error: red inline message "Invalid email or password" below password field.

---

### SCREEN 3: Tab Bar Layout

**File:** `app/(tabs)/_layout.tsx`

**Tab bar design:**
- White background, thin top border `#E5E5E5`, safe area bottom padding.
- 4 tabs: Home (`home`), SOS (`alert-circle`), History (`time`), Profile (`person`) — all Ionicons.
- Active tab: icon + label in `#C0392B`. Inactive: `#AAAAAA`.
- SOS tab: icon is 32px (others 24px) inside a 50px `#C0392B` filled circle with white icon. This tab visually dominates the bar.
- Home and History tab headers show "sembal" wordmark on left and `<NotificationBell />` on right.
- SOS and Profile tabs have no header bar (manage their own top area).

---

### SCREEN 4: Home — Blood Requests Feed

**File:** `app/(tabs)/index.tsx`

**Visual Layout:**
- Background: `#F5F5F5`.
- Header: white bar, 60px height. Left: "sembal" wordmark 22px bold `#C0392B`. Right: `<NotificationBell />`.
- Greeting row (inside scrollable content, not in header): "Hello, [First Name] 👋" 18px semibold, below it "[Blood Group] · [City]" 13px `#666666`.
- Stats strip: 3 horizontal white mini-cards (white bg, `#C0392B` number in 20px bold, gray label below in 12px): "X Active Requests", "X Donors Nearby", "X Fulfilled Today". Read-only.
- Filter bar (horizontal ScrollView, no wrapping): pills "All", "Normal", "Urgent", "Critical". Active: `#C0392B` filled, white text. Inactive: white bg, `#E5E5E5` border, `#666666` text.
- Sort label row: "Sorted by distance from you" in 12px `#999999` with sort icon. Tapping opens modal with 3 options: "Nearest first", "Most urgent first", "Newest first".
- FlatList of `<RequestCard />` separated by 10px.
- Floating Action Button: bottom-right, 56px circle, `#C0392B`, white `+` icon (24px), shadow. Taps → `requests/create.tsx`.
- Pull-to-refresh enabled.
- If location permission denied: orange banner at top — "Location access denied — distance sorting unavailable" with "Enable" button opening device settings.
- If user is not eligible or not available: red warning banner at top — "You are currently marked unavailable. Update your profile." with link to profile.

**`<RequestCard />` — `components/requests/RequestCard.tsx`:**
- White card, radius 14, shadow, padding 14px.
- Left edge: 4px wide full-height accent bar in urgency color (green/orange/red).
- Top row: `<UrgencyBadge />` left, blood group pill (`#C0392B` bg, white bold, e.g. "O+") right, distance "2.4 km away" 12px `#999999` next to it.
- Middle: patient name 16px semibold `#1A1A1A`. Hospital name 14px `#555555` below.
- Bottom: "X units needed" 13px `#666666` left. "Posted 10m ago" 12px `#999999` right.
- If `is_sos === true`: card bg `#FDEDED`, small red "SOS" pill badge next to urgency badge.
- Tap → `requests/[id].tsx`.

**`<UrgencyBadge />` — `components/requests/UrgencyBadge.tsx`:**
- Pill with urgency surface bg and urgency text color. Font 11px, weight 600, padding 3px 8px, radius 999.

**Logic:**
- On mount: get GPS via `expo-location`.
- Fetch all `blood_requests` where `status = 'open'`, join requester profile.
- Compute `distance` per request using `haversineDistance`. Store in Zustand `requestStore`.
- SOS requests always pinned to top, sorted among themselves by newest.
- Non-SOS requests sorted per active sort option.
- Subscribe to Supabase Realtime on `blood_requests` for INSERT. On new request: append to store with computed distance, show top toast "New blood request nearby".

---

### SCREEN 5: Create Blood Request

**File:** `app/requests/create.tsx`

**Visual Layout (white bg, scroll view):**
- Header: back arrow, "New Blood Request" centered 18px semibold.
- Thin `#C0392B` progress bar below header showing form completion %.
- Section label "Patient Info" 12px uppercase `#999999`.
  1. Patient Name — text input.
  2. Blood Group — 2×4 pill grid.
  3. Units Needed — numeric stepper: "−" button, number display, "+" button. Min 1, max 10. Buttons are 40px circles with `#F5F5F5` bg.
  4. Urgency — 3 large pill selectors side by side spanning full width: Normal (green `#27AE60`), Urgent (orange `#E67E22`), Critical (red `#C0392B`). Selected fills with the color and white text. Unselected: white bg, colored border and text.
- Section label "Location Info":
  5. Hospital Name — text input.
  6. Hospital Address — multiline 3 lines.
  7. Location row: green dot + "Using your GPS location" + coordinates in small text. "Change" link for manual lat/lng override (Phase 1: show lat/lng inputs with explanation note).
- Section label "Contact & Notes":
  8. Contact Number — phone input.
  9. Notes — optional multiline, placeholder "Additional info (contact person, blood bank, etc.)".
  10. Expires In — segmented control: "12 hrs" / "24 hrs" / "48 hrs" / "No expiry".
- "Post Blood Request" primary button.

**Logic:**
- Zod: patient name required, blood group required, units 1–10, hospital name required, hospital address required, contact required.
- Auto-fetch GPS on mount, show "Location detected ✓" green indicator.
- On submit: insert into `blood_requests` with `is_sos: false`, `status: 'open'`.
- Edge Function `notify-request-donors` fires on INSERT, finds donors with compatible blood group within 50 km (use `BLOOD_COMPATIBILITY` map), inserts notifications.
- Success toast: "Request posted. Nearby donors have been notified."
- Navigate to `/(tabs)/` and trigger re-fetch.

---

### SCREEN 6: Request Detail & Donor Response

**File:** `app/requests/[id].tsx`

**Visual Layout (white bg, scroll view):**
- Header: back arrow, "Request Details" title. If user is requester: "•••" menu right for Cancel option.
- Urgency banner: full-width colored banner (green/orange/red), white text, Ionicons warning icon + "URGENT REQUEST" / "CRITICAL REQUEST" label.
- Patient info card (white, shadow):
  - "Patient: [Name]" 18px bold. Blood group circle: 48px, `#C0392B` bg, white bold. "Needs X units" 16px `#555555`. Time posted + expiry.
- Hospital card:
  - Hospital name 16px semibold. Address 14px `#666666`.
  - Static map: Google Maps Static API image (400×150px, pin at hospital coords). If unavailable: gray placeholder with map pin Ionicon.
- Contact card:
  - "Contact Person" label. Phone number + green "Call Now" button (`#27AE60` bg, Ionicons `call` icon + "Call Now" text, white).
- Requester info row: small avatar + "Posted by [Name]" + distance + time.

**If current user IS the requester:**
- "Responses ([count])" section header.
- Each accepted donor row: avatar + name + blood group + distance + phone + green "Confirmed" or gray "Pending" status pill.
- "Mark as Fulfilled" button (`#27AE60`): updates `blood_requests.status = 'fulfilled'`, all accepted responses to `completed`, triggers donation record creation.

**If current user is NOT the requester:**
- If already accepted: green banner "You have accepted this request" + phone of requester shown.
- If already declined: gray "You declined this request".
- If not yet responded: two buttons stacked — "Accept & Respond" (red filled) and "Decline" (white with red border).
- Accept: opens small modal with optional message input. On confirm: insert `donor_responses` with status `accepted`. Send notification to requester: "A donor has accepted your request."
- Decline: insert `donor_responses` with status `declined`. No notification.
- Block acceptance if user is not eligible or not available — show modal explaining why.

**Logic:**
- Fetch request by ID, join requester profile.
- Fetch all `donor_responses` for this request_id.
- Realtime subscription on `donor_responses` for this `request_id` — new acceptances update the list live for the requester.
- After accepting: optimistic update in local state (don't wait for re-fetch).

---

### SCREEN 7: Eligibility Checker

**File:** `app/eligibility/index.tsx`

**Visual Layout (white bg):**
- Header: back arrow, "Check Eligibility".
- Progress bar: thin `#C0392B` line + "Step X of 5" label 12px `#999999`.
- Each step: Ionicons icon 48px `#C0392B` centered, question 22px semibold centered, subtext 15px `#666666` centered, input/selection below.
- "Next" button (disabled until answered) + "Back" ghost link above it.

**Steps:**

Step 1 — Age
- Question: "How old are you?"
- Input: large centered numeric input, 48px font size.
- Fail condition: outside 18–65 → red error "You must be between 18 and 65 years old to donate." → result `not_eligible`.

Step 2 — Weight
- Question: "What is your weight?"
- Input: numeric + "kg" unit suffix.
- Fail: < 50 kg → red error "Minimum weight is 50 kg." → result `not_eligible`.

Step 3 — Last Donation
- Question: "When did you last donate blood?"
- Two selectable cards: "Never donated" (passes) and "I have donated before" (reveals date picker).
- If donated within 56 days: orange "You can donate after [date]." → result `temporary`.

Step 4 — Medical Conditions
- Question: "Do you have any of the following?"
- Tappable checkbox cards:
  - HIV/AIDS → `not_eligible`
  - Hepatitis B or C → `not_eligible`
  - Active cancer → `not_eligible`
  - Heart disease → `not_eligible`
  - Uncontrolled diabetes → `temporary`
  - Epilepsy → `temporary`
  - "None of the above" (mutually exclusive)

Step 5 — Recent Events
- Question: "Have any of these happened recently?"
- Tappable checkbox cards:
  - Recent surgery (within 6 months) → `temporary`
  - Pregnancy / recently gave birth (within 6 months) → `temporary`
  - Recent tattoo or piercing (within 12 months) → `temporary`
  - Travel to malaria-prone area (within 12 months) → `temporary`
  - Currently on antibiotics or blood thinners → `temporary`
  - "None of the above"

**Result Screen:**
- Centered icon: green checkmark / orange clock / red X.
- Status pill: "ELIGIBLE" / "TEMPORARILY INELIGIBLE" / "NOT ELIGIBLE" in large text.
- Reason 16px `#555555`. If temporary: "You may be eligible after [date]" in orange.
- "Save Result" button: updates `profiles.eligibility_status`, inserts row into `eligibility_checks`.
- "Back to Profile" link. If eligible: also green CTA "View Open Requests" → Home.

---

### SCREEN 8: SOS Emergency System

**File:** `app/(tabs)/sos.tsx`

**Visual Layout — DARK THEME:**
- Background: `#1A0A0A` (very dark red-black). Status bar: light-content.
- Top: Ionicons `warning` 32px red, centered. "Emergency SOS" 24px bold white. Subtext "Use only in life-threatening emergencies. This will alert all available donors within 30 km." 14px `#FFAAAA` centered with 16px horizontal padding.
- Center: SOS button — 180px diameter circle. Background: LinearGradient from `#C0392B` (outer) to `#E74C3C` (inner). Outer ring: 4px solid `#E74C3C`, second ring at 8px gap semi-transparent. Uses `react-native-reanimated` infinite pulse animation: scale 1.0 → 1.15 → 1.0 over 1.5 seconds. Inside: droplet icon 28px white + "SOS" text 42px bold white stacked.
- Below button: "Tap to activate emergency alert" 13px `#FFAAAA`.
- Bottom info row: "Your blood type: [A+]" and "Location: [City]" small gray text.
- Rate limit state: if SOS used recently, button is gray and non-tappable. Show countdown "Next SOS available in 47:23" in orange replacing the subtext.

**Confirmation Modal (slides up from bottom):**
- Dark overlay background. Sheet bg `#2A0A0A`, border-radius top 20px.
- "Confirm Emergency Alert" 20px bold white.
- Body description of what will happen.
- Two dark-theme inputs (bg `#2C0F0F`, `#FF6B6B` border, white text): Hospital Name (required) + Contact Number (auto-filled from profile, editable).
- "Send Emergency Alert" button: `#C0392B`, white, 54px.
- "Cancel" ghost button below in white text.

**Post-SOS Confirmation (replaces screen content after successful trigger):**
- Green checkmark animation (scale 0 → 1 using Reanimated).
- "Alert Sent!" 28px bold white.
- "[X] donors have been notified" 20px `#FFAAAA`.
- Explanation text.
- "You can send another SOS in 60 minutes." in orange.
- "Back to Home" button (white text, `#C0392B` border).

**Logic:**
1. On SOS button press: call `can_trigger_sos(userId)` Supabase function. If false → show cooldown UI with countdown timer.
2. If allowed: open confirmation modal.
3. On confirm: get GPS coordinates via `expo-location`.
4. Insert into `sos_alerts`: `{ requester_id, blood_group, latitude, longitude, hospital_name, contact_number, radius_km: 30 }`.
5. Edge Function `notify-nearby-donors` fires: calls `find_nearby_donors()`, inserts notifications, sends pushes, updates `donors_notified`.
6. Subscribe or poll `sos_alerts` row to read `donors_notified` and show in confirmation screen.
7. Start countdown timer client-side: 60 minutes from `created_at` timestamp.

---

### SCREEN 9: Notifications

**`<NotificationBell />` — `components/notifications/NotificationBell.tsx`:**
- Ionicons `notifications` 26px `#1A1A1A`. If `unreadCount > 0`: 16px `#C0392B` circle badge top-right of icon, white text 10px (show "9+" if >9).
- Tapping → `notifications/index.tsx`.
- Supabase Realtime subscription on `notifications` for INSERT where `user_id = currentUserId` → increment unread count in Zustand.

**`app/notifications/index.tsx`:**
- White background.
- Header: "Notifications" 22px bold. Back arrow. "Mark all read" `#C0392B` link right (grayed if all read).
- Notifications grouped by date section headers: "Today", "Yesterday", "[N] days ago" in 12px uppercase `#999999`.
- FlatList of `<NotificationItem />`.
- Empty state: bell icon, "No notifications yet".

**`<NotificationItem />` — `components/notifications/NotificationItem.tsx`:**
- Row height ~72px. Unread: `#FFF8F8` bg + `#C0392B` 3px left border. Read: white bg.
- Left: 48px circle icon per notification type:
  - `blood_request` → `#EAF4FB` bg, `#2980B9` Ionicons `water`.
  - `sos` → `#FDEDED` bg, `#C0392B` Ionicons `alert-circle`.
  - `response` → `#EAF7EE` bg, `#27AE60` Ionicons `checkmark-circle`.
  - `system` → `#F5F5F5` bg, `#999999` Ionicons `information-circle`.
- Center: title 15px semibold `#1A1A1A`. Body 13px `#666666` max 2 lines. Time 11px `#AAAAAA`.
- Right: 8px `#C0392B` dot if unread.
- On tap: mark as read (Supabase update + Zustand decrement), then navigate based on `data` field.

**Navigation from notification `data`:**
- `data.request_id` present → navigate to `requests/[data.request_id]`.
- `data.type === 'system'` → no navigation, just mark read.

---

### SCREEN 10: Donation History

**File:** `app/(tabs)/history.tsx`

**Visual Layout:**
- Background `#F5F5F5`. Header: "My Donations" 22px bold, `<NotificationBell />` right.
- Stats row — 3 white cards horizontally (white bg, shadow):
  - Total Donations: large `[X]` 28px bold `#C0392B`, label "Total Donations" 12px `#666666`.
  - Lives Impacted: large `[X]` 28px bold `#C0392B` (total units × 3), label "Lives Impacted".
  - Last Donation: date 16px bold `#C0392B` (or "Never"), label "Last Donation".
- Section header "Donation Records" 13px uppercase `#999999`.
- FlatList of donation cards (white, radius 12, shadow):
  - Left: 40px `#C0392B` circle with Ionicons `calendar` white icon.
  - Hospital name 15px semibold. Date 14px `#666666`. "X unit(s) donated" 13px `#999999`.
  - If `request_id` not null: "View Request" 13px `#C0392B` link at bottom of card.
- Empty state: red heart icon 64px, "No donations yet", "Accept a blood request to log your first donation", "View Requests" button → Home.

**Logic:**
- Fetch `donation_records` where `donor_id = currentUserId`, ordered by `donation_date DESC`.
- Compute stats client-side: count, sum of units, lives (units × 3), most recent date.
- Donation records are created automatically by a backend trigger when a donor response is marked `completed` — the donor never manually adds records.

---

### SCREEN 11: Profile

**File:** `app/(tabs)/profile.tsx`

**View Mode Layout:**
- Background `#F5F5F5`.
- Hero card (white, large, shadow, radius 16):
  - Avatar: 80px circle. With `avatar_url`: show image. Without: initials (first + last letter) 28px bold white on `#C0392B` circle.
  - Name 22px bold `#1A1A1A`.
  - Blood group pill 28px: `#C0392B` bg, white bold.
  - City + State 14px `#666666`.
  - Eligibility badge pill (color per status: green/orange/red).
  - "Available to Donate" row: label 15px semibold + toggle switch (green `#27AE60` when on, `#CCCCCC` off). Toggle tap immediately updates `profiles.is_available` in Supabase.
  - "Edit Profile" ghost button right-side of card.
- Quick stats row: 3 white mini-cards (donations, requests created, donors helped).
- Menu card (white, each row is full-width tappable with icon + label + chevron):
  - Ionicons `body` → "Check Eligibility" → `eligibility/`.
  - Ionicons `heart` → "Organ Donation" → `organ-donation/`.
  - Ionicons `notifications` → "Notification Preferences" → push notification on/off toggle screen.
  - Ionicons `shield-checkmark` → "Privacy & Safety" → static info screen.
  - Ionicons `log-out` → "Sign Out" — red text, no chevron. Confirmation alert → `supabase.auth.signOut()` → clear Zustand → redirect to login.

**Edit Mode:**
- "Edit Profile" tap: transforms hero card into editable form pre-filled with current values.
- Avatar tap: opens `expo-image-picker` (photo library + camera), uploads to Supabase Storage `avatars/{userId}/avatar.jpg`, updates `profiles.avatar_url`.
- "Save Changes" button: `supabase.from('profiles').update(...)`, success toast "Profile updated".
- "Cancel" link: exits edit mode without saving.

---

### SCREEN 12: Organ Donation

**File:** `app/organ-donation/index.tsx`

**Visual Layout (white bg, scroll view):**
- Header: back arrow, "Organ Donation".
- Hero: simple SVG heart with plus sign in `#C0392B`, 80px, centered.
- "Be a life-giver beyond life" 22px semibold centered.
- Description 15px `#666666` centered with 24px padding.
- Main toggle row: "I wish to be an organ donor" 17px semibold + toggle (`#C0392B` on, `#CCCCCC` off).
- Organ selection (shown only when toggle ON):
  - Section label "Select organs to donate:" 13px uppercase `#999999`.
  - 2-column grid of organ chips. Unselected: white bg, `#E5E5E5` border. Selected: `#FDEDED` bg, `#C0392B` border + text, checkmark Ionicon right.
  - "Select All" link `#C0392B`.
- Legal disclaimer: 12px `#999999` italic.
- "Save Preference" button. If already saved: "Registered on [date]" 13px green below button.

**Logic:**
- Fetch existing `organ_donation_consents` on mount and pre-populate.
- On save: upsert row (insert if none, update if exists). Show success toast.

---

## Feature Connection Map

This describes exactly how all features connect. Cursor must implement all of these connections.

### Auth → Profile
`supabase.auth.signUp()` triggers `handle_new_user` DB function which creates the profile row. Immediately after signup, fetch profile and store in `authStore.profile`. Every screen reads from `authStore.profile` as source of truth.

### Profile → Eligibility Checker
The eligibility checker writes its result back to `profiles.eligibility_status`. The profile screen shows this as a colored badge. "Check Eligibility" menu row is the entry point. After completing the checker, result screen has "Back to Profile" which shows the updated badge immediately (re-fetch profile from Supabase before navigating back).

### Eligibility Status → Request Acceptance
Before allowing a donor to tap "Accept & Respond", check `authStore.profile.eligibility_status` and `is_available`. If `not_eligible`: show modal "You are not currently eligible to donate. Visit the Eligibility Checker to update your status." with button to eligibility screen. If `temporary`: show "You are temporarily ineligible. You may donate after [date]." Block acceptance in both cases.

### Profile Availability Toggle → Notification Targeting
When a user sets `is_available = false`, this is immediately written to Supabase. The Edge Functions that send blood request and SOS notifications filter by `is_available = TRUE` — so unavailable donors stop receiving request notifications instantly. The Home screen also shows a warning banner if the current user is unavailable.

### Home Feed ← Create Request (Realtime)
After a new request is created and inserted into Supabase, Supabase Realtime fires an INSERT event on `blood_requests`. The Home screen's Realtime subscription picks this up, computes its distance from the user's location, prepends it to the Zustand store (or top if SOS), and shows a small non-intrusive toast at the top of the screen.

### Home Feed → Request Detail
Tapping a `<RequestCard />` pushes the request `id` via Expo Router params to `requests/[id].tsx`. The detail screen always re-fetches from Supabase (not just uses passed object) so response counts are fresh.

### Request Detail → Donor Response → Donation Record
Flow when a request is fulfilled:
1. Donor taps "Accept & Respond" → `donor_responses` row inserted with `status: accepted`.
2. Notification sent to requester via Supabase insert.
3. Requester sees donor in response list on detail screen (live via Realtime).
4. Requester taps "Mark as Fulfilled" → `blood_requests.status = fulfilled`.
5. All `accepted` donor_responses for that request updated to `completed`.
6. Database trigger fires on `donor_responses.status = completed` → auto-inserts `donation_records` row for the donor.
7. Trigger also updates `profiles.last_donation_date = today` and `eligibility_status = temporary` for the donor.
8. Donor's History screen reflects the new record on next visit.

### SOS → Notification System → Home Feed
SOS insert triggers Edge Function which inserts notifications for all nearby eligible donors. These trigger Supabase Realtime on the `notifications` table — bells update live for all affected donors. Pushes also fire if app is closed. The SOS request appears pinned at the top of the Home feed with red SOS badge. Tapping the notification navigates to the request detail for the SOS request.

### Notifications → Deep Navigation
Notification `data.request_id` is always set for `blood_request`, `sos`, and `response` type notifications. Tapping navigates to `requests/[data.request_id]`. The notification bell in the header is always visible (Home + History screens) providing a persistent entry point to the notifications page.

### Donation History ← Backend Trigger
Donation records are never created by the app manually. They are auto-created by the Supabase database trigger when a `donor_responses` row is updated to `completed`. This means the History screen always shows an accurate record without any user input, making it fully automatic and trustworthy.

---

## State Management (Zustand)

### `stores/authStore.ts`
```typescript
interface AuthStore {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  logout: () => Promise<void>;
}
```

### `stores/requestStore.ts`
```typescript
interface RequestStore {
  requests: BloodRequest[];
  filter: 'all' | 'normal' | 'urgent' | 'critical';
  sortBy: 'distance' | 'urgency' | 'newest';
  isLoading: boolean;
  setRequests: (r: BloodRequest[]) => void;
  addRequest: (r: BloodRequest) => void;
  setFilter: (f: RequestStore['filter']) => void;
  setSortBy: (s: RequestStore['sortBy']) => void;
  getFilteredAndSorted: () => BloodRequest[]; // SOS always pinned to top
}
```

### `stores/notificationStore.ts`
```typescript
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[]) => void;
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}
```

---

## Push Notifications Setup

### `hooks/useNotifications.ts`
1. `Notifications.requestPermissionsAsync()` — request permission on app launch.
2. `Notifications.getExpoPushTokenAsync()` — get Expo push token.
3. Save token to `profiles.push_token` in Supabase (only if changed).
4. `Notifications.addNotificationReceivedListener` — when push arrives while app is open: add to Zustand store + increment unread count.
5. `Notifications.addNotificationResponseReceivedListener` — when user taps push (app was closed): read `notification.request.content.data`, navigate to appropriate screen.

---

## Supabase Edge Functions (Phase 1)

### `notify-nearby-donors` (fires on `sos_alerts` INSERT)
```
Read: blood_group, latitude, longitude, radius_km, requester_id
Call: find_nearby_donors(blood_group, lat, lon, radius_km)
For each donor:
  INSERT notifications: { user_id, type: 'sos', title: 'Emergency!', body, data: { request_id } }
  If push_token: POST to https://exp.host/--/api/v2/push/send
UPDATE sos_alerts SET donors_notified = count WHERE id = alert_id
```

### `notify-request-donors` (fires on `blood_requests` INSERT where `is_sos = false`)
```
Read: blood_group, latitude, longitude, hospital_name, requester_id
Find compatible blood groups from BLOOD_COMPATIBILITY map
Call: find_nearby_donors with each compatible group, within 50km
Deduplicate donor list
For each donor:
  INSERT notifications: { type: 'blood_request', title: 'Blood Request Near You', body, data: { request_id } }
  If push_token: send Expo push
```

---

## Row Level Security (RLS) Summary

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| profiles | all authenticated | own row (trigger) | own row | no |
| blood_requests | all authenticated | authenticated | own row | own row |
| donor_responses | own rows + requester | authenticated | own row | no |
| notifications | own rows | service role | own row | no |
| donation_records | own rows | service role (trigger) | own row | no |
| sos_alerts | all authenticated | authenticated | service role | no |
| organ_donation_consents | own row | own row | own row | own row |
| eligibility_checks | own rows | authenticated | no | no |

---

## Development Phases (Build Order in Cursor)

Build in this exact sequence to avoid dependency issues:

1. Project setup: Expo Router + Supabase client + NativeWind config + theme constants + TypeScript types + utility functions.
2. Auth screens: Register, Login, root layout auth guard, session persistence, splash screen.
3. Profile — view mode: fetch and display from Supabase. Availability toggle wired to Supabase.
4. Profile — edit mode: edit form + avatar upload to Supabase Storage.
5. Eligibility checker: 5-step form, result screen, save to profile + eligibility_checks table.
6. Tab bar layout: 4 tabs with correct icons and SOS tab styling.
7. Home feed: GPS, Supabase fetch, Haversine, RequestCard, UrgencyBadge, filter bar, sort modal, FAB, Realtime subscription.
8. Create blood request: full form, GPS auto-fill, Supabase insert.
9. Request detail: fetch by ID, dual view (requester vs donor), Accept/Decline with eligibility check, Realtime response updates, Mark as Fulfilled.
10. SOS screen: dark theme, pulsing button, confirmation modal, rate limiting, Supabase insert, post-SOS state, cooldown timer.
11. Notification system: NotificationBell, Realtime subscription, Notifications page, mark as read, deep navigation.
12. Push notifications: token registration, foreground + background handlers.
13. Donation history: records list, stats, empty state.
14. Organ donation: toggle, organ chips grid, upsert.
15. Feature connections: cross-screen navigation from notifications, eligibility blocking at acceptance, donation record auto-creation trigger (verify DB trigger is working end-to-end).
16. Polish pass: loading states on ALL screens, error handling on ALL Supabase calls, empty states on ALL lists, pull-to-refresh on Home + History, toast messages for all actions.

---

## Cursor Prompts (Copy-Paste Ready)

**1. Project Setup:**
"Set up a new Expo Router TypeScript project called sembal. Install and configure NativeWind, Supabase JS client with AsyncStorage, Zustand, react-hook-form + zod, expo-location, expo-notifications, expo-image-picker, expo-linear-gradient, react-native-reanimated. Create the full folder structure from the spec. Add constants/theme.ts with all COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BLOOD_GROUPS, ORGANS values. Add lib/utils.ts with haversineDistance, formatDistance, formatTimeAgo, getUrgencyLabel, getEligibilityLabel, and BLOOD_COMPATIBILITY map."

**2. Auth Screens:**
"Build the Login and Register screens for Sembal using the exact spec. Register: scrollable form with full name, email, phone, password (show/hide), DOB date picker, gender 3-pill selector, blood group 2×4 pill grid, city, state. Login: centered layout with logo, email/password, loading state in button. Both connect to Supabase Auth with react-hook-form + zod validation. Register calls signUp with metadata then updates profile row. Root _layout.tsx checks session and shows branded splash while loading."

**3. Home Feed:**
"Build the Home tab screen for Sembal per spec. Greeting row with user name and blood group. Stats strip with 3 mini-cards. Filter pill bar (All/Normal/Urgent/Critical) and sort modal. FlatList of RequestCard components with urgency left-border accent bar (green/orange/red), blood group pill, distance, patient name, hospital, time. SOS cards pinned to top with #FDEDED bg and SOS pill badge. GPS via expo-location, Haversine distance per card, stored in Zustand requestStore. Supabase Realtime subscription on blood_requests INSERT. FAB navigates to create screen. Pull-to-refresh."

**4. Create Request:**
"Build the Create Blood Request screen for Sembal. Patient name, blood group grid, units stepper (−/number/+), 3-pill urgency selector with colors (green/orange/red fills on select), hospital name, address, GPS auto-fill showing coordinates, contact, notes, expiry segmented control. Zod validation. On submit: insert to Supabase blood_requests. Toast on success. Navigate to Home."

**5. Request Detail:**
"Build requests/[id].tsx for Sembal per spec. Urgency banner (full-width colored). Patient info card. Hospital card with static Google Maps image. Contact card with green Call button. Requester info row. If current user is requester: list accepted donors with phone numbers and Mark as Fulfilled button. If donor: Accept (opens modal for optional message) and Decline buttons, blocked by eligibility check. Accept inserts donor_response and sends notification. Mark as Fulfilled updates request status and responses to completed. Realtime subscription on donor_responses for live updates."

**6. SOS Screen:**
"Build the SOS screen for Sembal. Dark theme (#1A0A0A bg, light status bar). Large 180px pulsing circle button using react-native-reanimated (scale 1.0 to 1.15 loop, 1.5s). LinearGradient from expo-linear-gradient on button. On press: check can_trigger_sos Supabase function. If rate limited: show countdown timer in orange, button grayed. If allowed: show bottom sheet modal with dark theme, hospital name input, contact pre-filled. On confirm: get GPS, insert sos_alerts, show post-SOS confirmation with animated green checkmark, donor count from donors_notified. 60-minute cooldown countdown."

**7. Notifications:**
"Build the Notifications system for Sembal. NotificationBell component with red unread count badge. Supabase Realtime subscription on notifications table for current user. Notifications page with date-grouped list using FlatList. NotificationItem with type-colored icon circles (blue for blood_request, red for sos, green for response, gray for system), unread left red border, mark read on tap, navigate to requests/[id] if data.request_id present. Zustand notificationStore. Mark all read button."

**8. Profile:**
"Build the Profile screen for Sembal. Hero card with initials fallback avatar, blood group pill, eligibility colored badge, availability toggle wired to Supabase. Edit mode: all fields editable, avatar upload via expo-image-picker to Supabase Storage avatars bucket. Menu list with Check Eligibility, Organ Donation, Notification Preferences, and Sign Out rows. Sign out clears Zustand and redirects to login."

**9. Eligibility Checker:**
"Build the 5-step Eligibility Checker for Sembal. Progress bar + step counter. Steps: age numeric input, weight + kg unit, last donation with two-card selector and date picker, medical conditions checkbox cards, recent events checkbox cards. Eligibility logic: severe conditions = not_eligible, donation within 56 days or mild conditions = temporary, all clear = eligible. Result screen with colored icon, status pill, reason, save button. Updates profiles.eligibility_status. Shows 'View Open Requests' CTA if eligible."

**10. Donation History:**
"Build the Donation History screen for Sembal. 3-card stats row: total donations, lives impacted (units × 3), last donation date. FlatList of donation_records with calendar icon circle, hospital name, date, units donated, optional View Request link. Empty state with heart icon and CTA. Fetch from Supabase donation_records where donor_id = current user, sorted by date descending."

**11. Organ Donation:**
"Build the Organ Donation screen for Sembal. Heart SVG icon. Main is_donor toggle. 2-column organ chip grid (only shown when toggle on): unselected white/gray, selected #FDEDED/#C0392B with checkmark. Select All link. Legal disclaimer. Upsert to organ_donation_consents. Show consent date if already registered. Success toast."

---

## Global Notes for Cursor

- Always use TypeScript strict mode — no `any` types anywhere.
- Use `expo-router` file-based routing — no `react-navigation`.
- All Supabase queries use the typed client from `lib/supabase.ts`.
- Use `zod` schemas for ALL form validation.
- Use `NativeWind` for all styling — no `StyleSheet.create`.
- Distance calculations always use `haversineDistance` from `lib/utils.ts`.
- SOS requests are ALWAYS pinned to the top of the Home feed regardless of active sort/filter.
- A donor cannot accept a request if `eligibility_status !== 'eligible'` or `is_available === false`. Show an informative modal explaining why.
- Donation records are created ONLY by backend triggers — never by the app directly.
- Never store sensitive data outside Supabase Auth session via AsyncStorage.
- All timestamps from Supabase are UTC — always display using `formatTimeAgo` or formatted date strings.
- All screens must show `ActivityIndicator` (`#C0392B`) during initial Supabase fetch.
- All Supabase calls must be wrapped in try/catch with user-visible error messages.
- All list screens must have a proper empty state with icon, title, subtitle, and optional CTA.
- Test every screen on both iOS and Android simulators before moving to the next step.
- All touch targets must be minimum 48×48px.