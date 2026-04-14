# Sembal – Organ Module
## Database Patch + Cursor Implementation Prompt

---

## PART 1 — SQL (Run in Supabase SQL Editor)

Paste and run the entire block below. It is additive — it does not touch any existing tables.

```sql
-- ============================================================
-- SEMBAL ORGAN MODULE — Database Patch
-- Run this in Supabase SQL Editor AFTER the main schema.
-- All statements are additive — nothing existing is changed.
-- ============================================================


-- ============================================================
-- 1. NEW ENUM: organ_request_status
-- Tracks the lifecycle of an organ request
-- ============================================================

CREATE TYPE organ_request_status AS ENUM (
  'open',        -- actively seeking a donor match
  'matched',     -- a registered donor has been identified
  'fulfilled',   -- transplant confirmed
  'cancelled',   -- requester cancelled
  'expired'      -- auto-expired after deadline
);


-- ============================================================
-- 2. NEW ENUM: organ_urgency
-- Separate from blood urgency — organ timelines are different
-- ============================================================

CREATE TYPE organ_urgency AS ENUM (
  'planned',    -- scheduled surgery, weeks/months away
  'urgent',     -- needed within days
  'critical'    -- life-threatening, needed immediately
);


-- ============================================================
-- 3. UPDATE NOTIFICATION TYPE ENUM
-- Add 'organ_request' and 'organ_response' as notification types
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organ_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organ_response';


-- ============================================================
-- 4. NEW TABLE: organ_requests
-- A request for a specific organ, posted by any authenticated user
-- (typically on behalf of a patient, similar to blood_requests)
-- ============================================================

CREATE TABLE organ_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who posted this request (requester, not the patient)
  requester_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Patient details
  patient_name        TEXT NOT NULL,
  patient_age         INTEGER CHECK (patient_age > 0 AND patient_age < 130),
  patient_gender      gender_type,

  -- Organ being requested
  organ_needed        TEXT NOT NULL,
  -- e.g. 'Heart', 'Kidneys', 'Liver', 'Lungs', etc.
  -- Stored as TEXT (not enum) to allow flexibility without schema changes

  -- Medical context
  blood_group_needed  blood_group NOT NULL,
  -- Blood group compatibility is critical for organ matching
  hospital_name       TEXT NOT NULL,
  hospital_address    TEXT NOT NULL,
  contact_number      TEXT NOT NULL,
  medical_notes       TEXT,
  -- Additional medical context, e.g. tissue type, weight range, urgency reason

  -- Location (for proximity matching with registered donors)
  location            GEOGRAPHY(POINT, 4326),
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,

  -- Urgency and status
  urgency             organ_urgency NOT NULL DEFAULT 'urgent',
  status              organ_request_status NOT NULL DEFAULT 'open',

  -- Optional deadline (e.g. patient deteriorating, surgery window)
  deadline            TIMESTAMPTZ,

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX organ_requests_requester_idx   ON organ_requests (requester_id);
CREATE INDEX organ_requests_status_idx      ON organ_requests (status);
CREATE INDEX organ_requests_organ_idx       ON organ_requests (organ_needed);
CREATE INDEX organ_requests_blood_group_idx ON organ_requests (blood_group_needed);
CREATE INDEX organ_requests_urgency_idx     ON organ_requests (urgency);
CREATE INDEX organ_requests_location_idx    ON organ_requests USING GIST (location);
CREATE INDEX organ_requests_created_at_idx  ON organ_requests (created_at DESC);


-- ============================================================
-- 5. NEW TABLE: organ_donor_responses
-- Registered organ donors can respond to organ requests.
-- Only users who have set is_donor = TRUE in
-- organ_donation_consents AND have consented to the specific
-- organ can respond.
-- ============================================================

CREATE TABLE organ_donor_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES organ_requests(id) ON DELETE CASCADE,
  donor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          response_status NOT NULL DEFAULT 'pending',
  message         TEXT,
  -- Donor can include a message, e.g. medical history note or availability
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A donor can only respond once per organ request
  UNIQUE (request_id, donor_id)
);

CREATE INDEX organ_donor_responses_request_idx ON organ_donor_responses (request_id);
CREATE INDEX organ_donor_responses_donor_idx   ON organ_donor_responses (donor_id);
CREATE INDEX organ_donor_responses_status_idx  ON organ_donor_responses (status);


-- ============================================================
-- 6. AUTO-UPDATE updated_at FOR organ_requests
-- ============================================================

CREATE TRIGGER organ_requests_updated_at
  BEFORE UPDATE ON organ_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Note: update_updated_at() function already exists from the main schema.


-- ============================================================
-- 7. AUTO-SET LOCATION FROM LAT/LNG FOR organ_requests
-- ============================================================

CREATE TRIGGER organ_requests_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON organ_requests
  FOR EACH ROW EXECUTE FUNCTION sync_location_from_coords();
-- Note: sync_location_from_coords() function already exists from main schema.


-- ============================================================
-- 8. GUARD TRIGGER: prevent self-response on organ requests
-- Prevents the requester from responding to their own organ request
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_self_organ_response()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_id UUID;
BEGIN
  SELECT requester_id INTO v_requester_id
  FROM organ_requests
  WHERE id = NEW.request_id;

  IF v_requester_id = NEW.donor_id THEN
    RAISE EXCEPTION
      'SELF_ORGAN_RESPONSE: cannot respond to your own organ request'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organ_donor_responses
    WHERE request_id = NEW.request_id
      AND donor_id = NEW.donor_id
      AND status != 'declined'
  ) THEN
    RAISE EXCEPTION
      'DUPLICATE_ORGAN_RESPONSE: already responded to this request'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION
      'DUPLICATE_ORGAN_RESPONSE: already responded to this request'
      USING ERRCODE = 'P0001';
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_organ_donor_response
  BEFORE INSERT ON organ_donor_responses
  FOR EACH ROW EXECUTE FUNCTION prevent_self_organ_response();


-- ============================================================
-- 9. GUARD TRIGGER: validate organ request data
-- Enforces business rules that cannot be expressed as constraints
-- ============================================================

CREATE OR REPLACE FUNCTION validate_organ_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Deadline, if set, must be at least 1 hour from now
  IF NEW.deadline IS NOT NULL AND NEW.deadline < NOW() + INTERVAL '1 hour' THEN
    RAISE EXCEPTION
      'INVALID_DEADLINE: must be at least 1 hour from now'
      USING ERRCODE = 'P0001';
  END IF;

  -- Critical requests must have a deadline or no deadline set
  -- (we allow critical with no deadline — open-ended emergency)

  -- Organ name must not be blank
  IF TRIM(NEW.organ_needed) = '' THEN
    RAISE EXCEPTION
      'INVALID_ORGAN: organ name cannot be empty'
      USING ERRCODE = 'P0001';
  END IF;

  -- Patient name must not be blank
  IF TRIM(NEW.patient_name) = '' THEN
    RAISE EXCEPTION
      'INVALID_PATIENT_NAME: patient name cannot be empty'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_organ_request_write
  BEFORE INSERT OR UPDATE ON organ_requests
  FOR EACH ROW EXECUTE FUNCTION validate_organ_request();


-- ============================================================
-- 10. NOTIFY TRIGGER: alert registered organ donors on new request
-- Inserts in-app notifications for users who have consented to
-- donate the specific organ being requested, with matching
-- blood group, within 100 km radius.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_organ_donors_on_request()
RETURNS TRIGGER AS $$
DECLARE
  donor RECORD;
BEGIN
  FOR donor IN
    SELECT p.id, p.full_name
    FROM profiles p
    JOIN organ_donation_consents odc ON odc.user_id = p.id
    WHERE
      odc.is_donor = TRUE
      AND NEW.organ_needed = ANY(odc.organs)
      AND p.id != NEW.requester_id
      AND p.location IS NOT NULL
      AND ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
        100000  -- 100 km radius for organ requests (wider than blood)
      )
  LOOP
    INSERT INTO notifications (
      user_id, type, title, body, data
    ) VALUES (
      donor.id,
      'organ_request',
      'Organ donation needed near you',
      NEW.organ_needed || ' needed for ' || NEW.patient_name ||
        ' at ' || NEW.hospital_name || '.',
      jsonb_build_object(
        'organ_request_id', NEW.id,
        'organ', NEW.organ_needed,
        'urgency', NEW.urgency
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Notification failure must never block the request creation
    RAISE WARNING 'Failed to notify organ donors for request %: %',
      NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_organ_request_insert
  AFTER INSERT ON organ_requests
  FOR EACH ROW EXECUTE FUNCTION notify_organ_donors_on_request();


-- ============================================================
-- 11. NOTIFY TRIGGER: alert requester when a donor responds
-- ============================================================

CREATE OR REPLACE FUNCTION notify_requester_on_organ_response()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_id UUID;
  v_organ        TEXT;
  v_donor_name   TEXT;
BEGIN
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT r.requester_id, r.organ_needed, p.full_name
  INTO v_requester_id, v_organ, v_donor_name
  FROM organ_requests r
  JOIN profiles p ON p.id = NEW.donor_id
  WHERE r.id = NEW.request_id;

  INSERT INTO notifications (
    user_id, type, title, body, data
  ) VALUES (
    v_requester_id,
    'organ_response',
    'A donor responded to your organ request',
    v_donor_name || ' has indicated willingness to donate their ' || v_organ || '.',
    jsonb_build_object(
      'organ_request_id', NEW.request_id,
      'response_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to notify requester for organ response %: %',
      NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_organ_response_insert
  AFTER INSERT ON organ_donor_responses
  FOR EACH ROW EXECUTE FUNCTION notify_requester_on_organ_response();


-- ============================================================
-- 12. HELPER FUNCTION: find nearby registered organ donors
-- Returns donors who have consented to donate a specific organ
-- within a given radius, with matching blood group.
-- Usage: SELECT * FROM find_organ_donors('Kidneys', 'O+', 12.97, 77.59, 100);
-- ============================================================

CREATE OR REPLACE FUNCTION find_organ_donors(
  p_organ         TEXT,
  p_blood_group   blood_group,
  p_latitude      DOUBLE PRECISION,
  p_longitude     DOUBLE PRECISION,
  p_radius_km     INTEGER DEFAULT 100
)
RETURNS TABLE (
  id            UUID,
  full_name     TEXT,
  blood_group   blood_group,
  push_token    TEXT,
  distance_km   DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.blood_group,
    p.push_token,
    ROUND(
      (ST_Distance(
        p.location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
      ) / 1000.0)::NUMERIC, 2
    )::DOUBLE PRECISION AS distance_km
  FROM profiles p
  JOIN organ_donation_consents odc ON odc.user_id = p.id
  WHERE
    odc.is_donor = TRUE
    AND p_organ = ANY(odc.organs)
    AND p.blood_group = p_blood_group
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 13. ROW LEVEL SECURITY for new tables
-- ============================================================

ALTER TABLE organ_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE organ_donor_responses   ENABLE ROW LEVEL SECURITY;

-- ORGAN REQUESTS
CREATE POLICY "Authenticated users can view all organ requests"
  ON organ_requests FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create organ requests"
  ON organ_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update their own organ requests"
  ON organ_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Users can delete their own organ requests"
  ON organ_requests FOR DELETE TO authenticated
  USING (requester_id = auth.uid());

-- ORGAN DONOR RESPONSES
CREATE POLICY "Users can view responses to their requests or their own responses"
  ON organ_donor_responses FOR SELECT TO authenticated
  USING (
    donor_id = auth.uid()
    OR request_id IN (
      SELECT id FROM organ_requests WHERE requester_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create organ responses"
  ON organ_donor_responses FOR INSERT TO authenticated
  WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Users can update their own organ responses"
  ON organ_donor_responses FOR UPDATE TO authenticated
  USING (donor_id = auth.uid());


-- ============================================================
-- 14. REALTIME for organ tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE organ_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE organ_donor_responses;


-- ============================================================
-- DONE — Organ Module patch complete.
-- New tables: organ_requests, organ_donor_responses
-- New enums:  organ_request_status, organ_urgency
-- Updated:    notification_type (organ_request, organ_response added)
-- ============================================================
```

---

---

## PART 2 — Cursor Implementation Prompt

Copy and paste the entire section below into Cursor as your implementation brief.

---

### Sembal — Organ Module: Full Implementation Brief

---

#### What is changing and why

The existing app has an Organ Donation screen accessible from the Profile menu. That screen only lets users register their own consent to donate organs after death. There is no way for anyone to post a request for an organ or for a registered donor to respond.

This update replaces the standalone organ donation screen with a unified **Organ Hub** — a new fifth tab on the bottom navigation bar. The tab combines two functions in a single scrollable screen: posting and browsing organ requests, and managing your own organ donation preference. The Profile menu link to organ donation is removed; that functionality now lives exclusively inside the Organ tab.

---

#### 1. Bottom Tab Bar Changes

The tab bar currently has 4 tabs: Home, SOS, History, Profile.

Add a fifth tab between History and Profile:

- Tab label: "Organ"
- Tab icon: Ionicons `heart` (outline when inactive, filled when active)
- Active color: `#C0392B`
- Inactive color: `#AAAAAA`
- File: `app/(tabs)/organ.tsx`

The SOS tab keeps its special large red circle treatment. The remaining tabs (Home, History, Organ, Profile) use the standard 24px icon size. Because there are now 5 tabs, each tab label should be reduced to 10px font size to prevent crowding. The tab bar height remains the same.

Remove the "Organ Donation" row from the Profile screen's menu list. Everything related to organ donation and organ requests now lives in the Organ tab.

---

#### 2. New Screen: Organ Hub (`app/(tabs)/organ.tsx`)

This is a single scrollable screen divided into two clearly separated sections. Use a sticky section switcher at the top (two pill tabs: "Requests" and "My Preference") that controls which section is visible. Both sections are part of the same screen — not separate screens.

---

##### Section A — Organ Requests (shown when "Requests" pill is active)

**Header area:**
- Title: "Organ Requests" 22px bold `#1A1A1A`.
- Subtitle: "Registered donors are notified automatically." 13px `#666666`.
- Stats strip: 2 white mini-cards — "X Open Requests" and "X Registered Donors Nearby". Read-only.
- Filter bar (horizontal scroll): pills for "All", "Heart", "Kidneys", "Liver", "Lungs", "Corneas", "Skin", "Bone Marrow". Active pill: `#C0392B` filled, white text. Inactive: white, gray border.
- Urgency filter: secondary smaller pills — "All", "Planned", "Urgent", "Critical".
- Floating Action Button (FAB): bottom-right, 56px circle, `#C0392B`, white `+` icon. Tapping opens the Create Organ Request bottom sheet (not a new screen — use a modal sheet).

**Organ Request Card (`<OrganRequestCard />`):**
Each card is a white card, radius 14, shadow, padding 14px. Layout:
- Left edge accent bar: 4px full-height, color based on urgency: `#27AE60` for planned, `#E67E22` for urgent, `#C0392B` for critical.
- Top row: urgency badge pill (green/orange/red, same style as blood UrgencyBadge) left. Organ name pill (`#8E44AD` background — purple — white bold text, e.g. "Kidneys") right. Blood group pill (`#C0392B` bg, white, e.g. "O+") next to organ.
- Middle: patient name 16px semibold `#1A1A1A`. Hospital name 14px `#555555`.
- Bottom: "Needed by [date or 'ASAP']" 13px `#666666` left. Posted time right 12px `#999999`.
- If current user is a registered organ donor for that organ: show a small purple "You can help" badge in the bottom-left corner.
- Tapping the card navigates to `app/organ/[id].tsx`.

**Empty state (no requests):** purple heart icon (Ionicons `heart`, 64px, `#8E44AD`), "No organ requests at the moment", "Check back later or post a request" + "Post Request" CTA button.

---

##### Section B — My Preference (shown when "My Preference" pill is active)

This section is the existing organ donation consent form — moved here from the Profile screen. Exact same functionality as before:

- Hero: SVG heart with plus, 80px, centered, `#C0392B`.
- "Be a life-giver beyond life" 22px semibold.
- Description paragraph 15px `#666666`.
- Main toggle: "I wish to be an organ donor" — `#C0392B` when on.
- Organ selection grid (2 columns, shown only when toggle on):
  - Unselected: white bg, `#E5E5E5` border.
  - Selected: `#FDEDED` bg, `#C0392B` border + text, checkmark icon.
  - "Select All" link.
- Legal disclaimer 12px `#999999` italic.
- "Save Preference" button — full width `#C0392B`.
- If saved: "Registered on [date]" 13px green.

**Connection to requests:** After saving donor preference, if the user just enabled organs, show an inline green banner: "You are now registered as a donor. You'll be notified when an organ request matches your registered organs." This banner is dismissable.

---

#### 3. Create Organ Request — Bottom Sheet Modal

Opened by the FAB on the Requests section. This is a modal sheet (slides up from bottom, not a full navigation push). White background. Drag handle at top.

Fields (all required unless noted):
1. Patient Name — text input.
2. Patient Age — numeric input.
3. Patient Gender — 3-pill selector: Male / Female / Other.
4. Organ Needed — horizontal scrollable pill grid using the same organ list from `ORGANS` constant. Single-select only. Selected: `#8E44AD` bg, white text.
5. Blood Group Needed — 8-pill grid, same as blood request form. Selected: `#C0392B` bg, white.
6. Urgency — 3 large pill selectors: Planned (`#27AE60`), Urgent (`#E67E22`), Critical (`#C0392B`).
7. Hospital Name — text input.
8. Hospital Address — multiline 3 lines.
9. Location — GPS auto-fill (same pattern as blood requests). Shows "Location detected ✓".
10. Contact Number — phone input.
11. Deadline — optional date+time picker. Label "Needed by (optional)".
12. Medical Notes — optional multiline. Placeholder "Tissue type, urgency reason, medical context."

"Post Organ Request" button — full width, `#8E44AD` (purple, to visually distinguish from blood requests which are red). Use purple as the primary action color for all organ request actions.

Zod validation: patient_name required, organ_needed required, blood_group_needed required, hospital_name required, hospital_address required, contact_number required, deadline if set must be > 1 hour from now.

On submit: insert into `organ_requests` table. The database trigger `notify_organ_donors_on_request` fires automatically and notifies nearby registered donors. Show success toast: "Organ request posted. Registered donors in your area have been notified."

---

#### 4. Organ Request Detail Screen (`app/organ/[id].tsx`)

Full-screen detail for an organ request. White background, scroll view.

Layout:
- Header: back arrow, "Organ Request Details". If user is requester: "•••" menu with Cancel option.
- Urgency banner: full-width colored banner (green/orange/red), white text, organ name + urgency label.
- Patient info card: patient name 18px bold, organ needed as a purple pill (48px tall, `#8E44AD` bg, white bold), blood group red circle (same as blood request detail), "Age: X · Gender: [M/F]", deadline row showing "Needed by [date]" or "No deadline set".
- Hospital card: hospital name, address, static map image (Google Maps Static API).
- Contact card: contact number + green "Call Now" button.
- Medical notes card (shown only if notes exist): Ionicons `document-text` icon + notes text in 14px `#555555`.
- Requester info row: avatar + "Posted by [Name]" + time.

**If current user IS the requester:**
- "Donor Responses ([count])" section.
- Each donor row: avatar + name + blood group + "Has consented to donate [organ]" label + phone + Accept/Pending status pill.
- "Mark as Matched" button (`#8E44AD`): updates `organ_requests.status = 'matched'`. This does NOT auto-create donation records (organ donation is a long process — no automatic record creation unlike blood).
- "Mark as Fulfilled" button (shown after matched): updates status to `'fulfilled'`.
- "Cancel Request" in the "•••" menu: updates status to `'cancelled'`.

**If current user is NOT the requester:**
- Check if user has consented to donate the specific organ in `organ_donation_consents`. If YES and they haven't responded yet: show "You are a registered donor for this organ. Would you like to indicate your willingness?" with "I'm willing to help" (`#8E44AD` filled) and "Decline" (white/purple border) buttons.
- If user has NOT consented to this organ: show a gray informational card — "You are not registered as a donor for [organ]. You can update your organ donation preference in the Organ tab." with a link to the My Preference section.
- If already responded: show their response status (green "You indicated willingness" or gray "You declined").

On "I'm willing to help": insert into `organ_donor_responses` with `status: 'accepted'`. Trigger `notify_requester_on_organ_response` fires automatically.

---

#### 5. Notification Deep Linking for Organ Module

The existing notification system uses `data.request_id` to navigate to blood request details. For organ notifications, the `data` field uses `data.organ_request_id`. Update `NotificationItem` tap handler:

- If `notification.type === 'organ_request'` → navigate to `organ/[data.organ_request_id]`.
- If `notification.type === 'organ_response'` → navigate to `organ/[data.organ_request_id]`.

Update `NotificationItem` icon circle for organ types:
- `organ_request` → `#F3E8FF` bg (light purple), `#8E44AD` Ionicons `heart` icon.
- `organ_response` → `#F3E8FF` bg, `#8E44AD` Ionicons `checkmark-circle` icon.

---

#### 6. New TypeScript Types to Add in `lib/types.ts`

```typescript
export type OrganRequestStatus = 'open' | 'matched' | 'fulfilled' | 'cancelled' | 'expired';
export type OrganUrgency = 'planned' | 'urgent' | 'critical';

export interface OrganRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: 'male' | 'female' | 'other' | null;
  organ_needed: string;
  blood_group_needed: BloodGroup;
  hospital_name: string;
  hospital_address: string;
  contact_number: string;
  medical_notes: string | null;
  latitude: number;
  longitude: number;
  urgency: OrganUrgency;
  status: OrganRequestStatus;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  distance?: number;
}

export interface OrganDonorResponse {
  id: string;
  request_id: string;
  donor_id: string;
  status: ResponseStatus;
  message: string | null;
  responded_at: string;
  created_at: string;
  request?: OrganRequest;
  donor?: Profile;
}
```

---

#### 7. Update `stores/` in Zustand

Add a new Zustand store `stores/organStore.ts`:

```typescript
interface OrganStore {
  organRequests: OrganRequest[];
  organFilter: string;   // organ name filter, 'all' means no filter
  urgencyFilter: OrganUrgency | 'all';
  isLoading: boolean;
  setOrganRequests: (r: OrganRequest[]) => void;
  addOrganRequest: (r: OrganRequest) => void;
  setOrganFilter: (f: string) => void;
  setUrgencyFilter: (u: OrganStore['urgencyFilter']) => void;
  getFiltered: () => OrganRequest[];
}
```

---

#### 8. Realtime Subscription for Organ Tab

In `app/(tabs)/organ.tsx`, subscribe to Supabase Realtime on `organ_requests` for INSERT events (same pattern as blood requests on Home screen). On new organ request: append to `organStore`, show top toast "New organ request nearby".

---

#### 9. Color Coding — Organ vs Blood

To visually differentiate organ module from blood module throughout the app:

- All blood request actions, badges, and primary buttons: `#C0392B` (red).
- All organ request actions, badges, and primary buttons: `#8E44AD` (purple).
- The organ pill on request cards uses `#8E44AD` background.
- The "I'm willing to help" button and "Post Organ Request" button are purple.
- The urgency badge colors (green/orange/red) are shared between both modules — those encode urgency level, not module type.

Add to `constants/theme.ts`:
```typescript
organ: '#8E44AD',
organDark: '#6C3483',
organLight: '#9B59B6',
organSurface: '#F3E8FF',
```

---

#### 10. Profile Screen Update

Remove the "Organ Donation" menu row from the profile screen menu list (the one with Ionicons `heart` icon). The Organ tab now handles this entirely. No other changes to the Profile screen.

---

#### 11. Build Order for This Feature

Build in this order to avoid dependency issues:

1. Add new TypeScript types to `lib/types.ts` and organ color to `constants/theme.ts`.
2. Create `stores/organStore.ts`.
3. Add the 5th Organ tab to `app/(tabs)/_layout.tsx`. Point it at `organ.tsx`.
4. Build `app/(tabs)/organ.tsx` — pill tab switcher, Section B (My Preference, moved from profile) first since it reuses existing logic.
5. Build `<OrganRequestCard />` component in `components/organ/OrganRequestCard.tsx`.
6. Build Section A (Requests feed) using OrganRequestCard, filter pills, stats strip. Add Realtime subscription.
7. Build the Create Organ Request bottom sheet modal inside `organ.tsx`.
8. Build `app/organ/[id].tsx` — detail screen with dual view (requester vs donor), respond/decline flow.
9. Update `NotificationItem` to handle `organ_request` and `organ_response` types with purple icon circles and correct deep-link navigation.
10. Remove "Organ Donation" row from Profile screen menu.
11. Test: post a request, verify nearby donor notification inserts, verify response notification inserts, verify status transitions (open → matched → fulfilled).

---

#### 12. Cursor Prompt (Copy-Paste Ready)

"Add the Organ Module to Sembal as specified. Add a 5th tab 'Organ' (Ionicons heart icon, `#C0392B` active color) to the tab bar between History and Profile. Remove the Organ Donation menu row from the Profile screen. Build app/(tabs)/organ.tsx with two sections controlled by a pill switcher at top: 'Requests' and 'My Preference'. Requests section: organ filter pills, urgency filter pills, FlatList of OrganRequestCard (purple organ pill `#8E44AD`, urgency left-border accent, blood group red pill), stats strip, FAB that opens a Create Organ Request bottom sheet modal. Modal fields: patient name, age, gender pills, organ single-select pills, blood group grid, urgency 3-pills, hospital name, address, GPS location, contact, optional deadline and notes. On submit: insert into organ_requests table. My Preference section: exact same UI as the old organ donation screen — is_donor toggle, 2-column organ chip grid with purple selected state, legal disclaimer, Save button upsert to organ_donation_consents. Build app/organ/[id].tsx for detail screen: urgency banner, patient card with purple organ pill, hospital card, contact call button, dual view (requester sees donor responses + Mark as Matched button, donor sees willing/decline buttons blocked if not registered for that organ). Update NotificationItem to handle organ_request and organ_response types with purple icon and navigation to organ/[id]. Add OrganRequest and OrganDonorResponse TypeScript types. Add organStore Zustand store. Add organ color tokens to theme.ts."
