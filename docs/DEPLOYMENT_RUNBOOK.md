# Sembal Deployment Runbook

This runbook gives a strict go-live order with exact commands.

## 0) Prerequisites

- Node.js 18+ and npm
- Supabase CLI installed
- Docker running (for local Supabase stack)
- A Supabase project already created in the dashboard

Install CLI:

```bash
npm install -g supabase
```

Login:

```bash
supabase login
```

Link repo to your remote project:

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

---

## 1) Database setup (source of truth)

Run schema in remote Supabase SQL editor:

1. Open Supabase Dashboard -> SQL Editor.
2. Paste `schema.sql`.
3. Execute once.

Optional CLI path (if you split to migrations):

```bash
supabase db push
```

Post-checks in SQL editor:

- confirm tables exist (`profiles`, `blood_requests`, `donor_responses`, `notifications`, `sos_alerts`, etc.)
- confirm functions exist (`can_trigger_sos`, `find_nearby_donors`, `process_expired_requests`, `refresh_eligibility_status`)
- confirm RLS policies are enabled

---

## 2) Deploy Edge Functions

Functions included in repo:

- `notify-donor-accepted`
- `notify-sos-nearby`
- `cron-maintenance`

Deploy:

```bash
supabase functions deploy notify-donor-accepted
supabase functions deploy notify-sos-nearby
supabase functions deploy cron-maintenance
```

---

## 3) Set function secrets

Set required environment secrets for edge runtime:

```bash
supabase secrets set SUPABASE_URL=https://<PROJECT_REF>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
```

Verify:

```bash
supabase secrets list
```

---

## 4) Configure app environment

Create `.env` in repo root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

Install and run app:

```bash
npm install
npm run android
```

---

## 5) Cron schedule (production)

`cron-maintenance` is intended for scheduled execution and calls:

- `process_expired_requests`
- `refresh_eligibility_status`

Recommended schedule:

- every 15 minutes (or hourly if lower traffic)

Use one of:

- Supabase Scheduled Functions (if available in your plan/region), or
- external scheduler (GitHub Actions, Cloud Scheduler, cron-job.org) calling function URL.

Endpoint format:

```text
POST https://<PROJECT_REF>.functions.supabase.co/cron-maintenance
Authorization: Bearer <SERVICE_ROLE_OR_FUNCTION_JWT_AS_REQUIRED>
```

---

## 6) Go-live verification checklist

- Auth: register/login/logout works
- Profile row auto-created on signup trigger
- Create request writes successfully
- Donor response writes successfully
- `notify-donor-accepted` creates requester notification
- SOS insert works and `notify-sos-nearby` inserts notifications
- Notifications visible in app and mark-read works
- `cron-maintenance` runs without errors
- RLS blocks unauthorized access as expected

---

## 7) Rollback/Recovery notes

- If function deploy fails: redeploy only failed function
- If schema issue found: apply corrective SQL migration (never hot-edit app logic to bypass DB rules)
- If app env wrong: fix `.env`, restart Metro with cache clear:

```bash
npx expo start --clear
```
