# Sembal (Expo + Supabase)

Blood donation emergency response app built with Expo Router and Supabase.

## Architecture contract

- Database is the source of truth.
- Frontend sends data and displays Supabase errors.
- Business rules belong in Postgres functions/triggers and Edge Functions.
- Frontend should not duplicate critical business logic.

## Environment

Create `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Run app

```bash
npm install
npm run android
```

## Database

Run `schema.sql` in Supabase SQL editor.

## Edge Functions included

- `notify-donor-accepted`
- `notify-sos-nearby`
- `cron-maintenance`

Deploy:

```bash
supabase functions deploy notify-donor-accepted
supabase functions deploy notify-sos-nearby
supabase functions deploy cron-maintenance
```

Set secrets:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
```

## Frontend integration points

- Donor accept flow invokes `notify-donor-accepted`.
- SOS creation invokes `notify-sos-nearby`.
- Cron function is for scheduled jobs (`process_expired_requests`, `refresh_eligibility_status`).
