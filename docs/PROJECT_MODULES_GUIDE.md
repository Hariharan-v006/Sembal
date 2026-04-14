# Sembal Project Modules Guide

This document explains every major folder/module, what it is for, and how the app runs end-to-end.

## Repository structure

- `app/`
  - Expo Router screens and layouts.
  - Route groups:
    - `(auth)` for login/register
    - `(tabs)` for main app tabs
    - `requests/`, `notifications/`, `eligibility/`, `organ-donation/` for feature routes
- `components/`
  - Reusable UI blocks (`requests`, `notifications`, and shared UI elements).
- `constants/`
  - Design/theme constants and fixed option lists.
- `hooks/`
  - Reusable behavior hooks (`useLocation`, `useNotifications`).
- `lib/`
  - Core integrations/utilities:
    - `supabase.ts` client setup
    - `types.ts` app/domain TS types
    - `utils.ts` formatting/distance helpers
    - `edgeFunctions.ts` wrapper for invoking Supabase Edge Functions
- `stores/`
  - Zustand state stores:
    - auth/session/profile store
    - request listing/filter/sort store
    - notifications + unread count store
- `supabase/`
  - Supabase project config and Edge Functions.
  - `config.toml` local/dev Supabase config.
  - `functions/` contains server-side workflows.
- `schema.sql`
  - Database schema with enums/tables/RLS/functions/triggers.
- `docs/`
  - Operational docs and runbooks.

## What each key app module does

- `app/_layout.tsx`
  - Root auth gate; loads session/profile and routes to auth or main tabs.
- `app/(auth)/login.tsx`
  - Sign-in UI and `supabase.auth.signInWithPassword`.
- `app/(auth)/register.tsx`
  - Sign-up UI and `supabase.auth.signUp`, followed by profile update.
- `app/(tabs)/index.tsx`
  - Home feed; fetches open requests, calculates distance, handles filters/sort/realtime.
- `app/requests/create.tsx`
  - Request creation form; inserts into `blood_requests`.
- `app/requests/[id].tsx`
  - Request detail; donor accept/decline and requester fulfillment action.
  - Accept flow triggers `notify-donor-accepted` edge function.
- `app/(tabs)/sos.tsx`
  - SOS creation; inserts into `sos_alerts` then triggers `notify-sos-nearby`.
- `app/notifications/index.tsx`
  - Notification list with grouping/read state/deep navigation.
- `app/(tabs)/history.tsx`
  - Donation history + summary cards.
- `app/(tabs)/profile.tsx`
  - Availability toggle, quick stats, links to eligibility and organ donation.
- `app/eligibility/index.tsx`
  - Submits eligibility answers and syncs status from backend processing.
- `app/organ-donation/index.tsx`
  - Organ consent preferences and upsert to `organ_donation_consents`.

## Edge Function modules

- `supabase/functions/notify-donor-accepted/index.ts`
  - Inserts a requester notification when donor accepts.
- `supabase/functions/notify-sos-nearby/index.ts`
  - Finds nearby donors via RPC and inserts SOS notifications.
- `supabase/functions/cron-maintenance/index.ts`
  - Runs periodic backend maintenance RPCs.

## Local development: complete manual procedure

## A) App-only mode (remote Supabase project)

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

3. Start app:

```bash
npm run android
```

Use:
- `npm run ios` (macOS)
- `npm run web` (web target)

## B) Local Supabase stack + local functions (full dev)

1. Start local Supabase:

```bash
supabase start
```

2. Apply schema to local DB:

```bash
supabase db reset
```

3. Serve functions locally:

```bash
supabase functions serve notify-donor-accepted --env-file .env
supabase functions serve notify-sos-nearby --env-file .env
supabase functions serve cron-maintenance --env-file .env
```

4. Point app `.env` to local API if needed:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<LOCAL_ANON_KEY_FROM_SUPABASE_START_OUTPUT>
```

5. Run app:

```bash
npm run android
```

## Common dev commands

- Type check:

```bash
npx tsc --noEmit
```

- Clean Expo cache:

```bash
npx expo start --clear
```

- Deploy one function:

```bash
supabase functions deploy <FUNCTION_NAME>
```

## Operational notes

- Business correctness should remain in DB functions/triggers and edge functions.
- Frontend should surface DB/function errors, not bypass them.
- Keep `schema.sql` and function contracts in sync with app payloads.
