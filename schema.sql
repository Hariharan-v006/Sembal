-- ============================================================
-- SEMBAL – Blood Response Network
-- Supabase Database Setup (Phase 1)
-- Run this entire file in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

-- Enable PostGIS for location-based queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE blood_group AS ENUM (
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);

CREATE TYPE urgency_level AS ENUM (
  'normal', 'urgent', 'critical'
);

CREATE TYPE eligibility_status AS ENUM (
  'eligible', 'not_eligible', 'temporary'
);

CREATE TYPE request_status AS ENUM (
  'open', 'fulfilled', 'cancelled', 'expired'
);

CREATE TYPE response_status AS ENUM (
  'pending', 'accepted', 'declined', 'completed'
);

CREATE TYPE notification_type AS ENUM (
  'blood_request', 'sos', 'response', 'system'
);

CREATE TYPE gender_type AS ENUM (
  'male', 'female', 'other'
);


-- ============================================================
-- 2. PROFILES
-- Extends Supabase auth.users — one row per user
-- ============================================================

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone               TEXT,
  blood_group         blood_group NOT NULL,
  date_of_birth       DATE,
  gender              gender_type,
  city                TEXT,
  state               TEXT,
  -- PostGIS geography point for spatial queries
  location            GEOGRAPHY(POINT, 4326),
  -- Also stored flat for simple distance queries
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  eligibility_status  eligibility_status NOT NULL DEFAULT 'eligible',
  last_donation_date  DATE,
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url          TEXT,
  push_token          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for spatial proximity queries
CREATE INDEX profiles_location_idx ON profiles USING GIST (location);
CREATE INDEX profiles_blood_group_idx ON profiles (blood_group);
CREATE INDEX profiles_available_idx ON profiles (is_available);


-- ============================================================
-- 3. BLOOD REQUESTS
-- ============================================================

CREATE TABLE blood_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name      TEXT NOT NULL,
  blood_group       blood_group NOT NULL,
  units_needed      INTEGER NOT NULL CHECK (units_needed > 0),
  urgency           urgency_level NOT NULL DEFAULT 'normal',
  hospital_name     TEXT NOT NULL,
  hospital_address  TEXT NOT NULL,
  location          GEOGRAPHY(POINT, 4326),
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  contact_number    TEXT NOT NULL,
  notes             TEXT,
  status            request_status NOT NULL DEFAULT 'open',
  is_sos            BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX blood_requests_status_idx ON blood_requests (status);
CREATE INDEX blood_requests_urgency_idx ON blood_requests (urgency);
CREATE INDEX blood_requests_blood_group_idx ON blood_requests (blood_group);
CREATE INDEX blood_requests_location_idx ON blood_requests USING GIST (location);
CREATE INDEX blood_requests_requester_idx ON blood_requests (requester_id);
CREATE INDEX blood_requests_created_at_idx ON blood_requests (created_at DESC);


-- ============================================================
-- 4. DONOR RESPONSES
-- ============================================================

CREATE TABLE donor_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id    UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        response_status NOT NULL DEFAULT 'pending',
  message       TEXT,
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A donor can only respond once per request
  UNIQUE (request_id, donor_id)
);

CREATE INDEX donor_responses_request_idx ON donor_responses (request_id);
CREATE INDEX donor_responses_donor_idx ON donor_responses (donor_id);
CREATE INDEX donor_responses_status_idx ON donor_responses (status);


-- ============================================================
-- 5. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_is_read_idx ON notifications (is_read);
CREATE INDEX notifications_created_at_idx ON notifications (created_at DESC);


-- ============================================================
-- 6. DONATION RECORDS
-- ============================================================

CREATE TABLE donation_records (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id     UUID REFERENCES blood_requests(id) ON DELETE SET NULL,
  donation_date  DATE NOT NULL,
  hospital_name  TEXT NOT NULL,
  units_donated  INTEGER NOT NULL DEFAULT 1 CHECK (units_donated > 0),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX donation_records_donor_idx ON donation_records (donor_id);
CREATE INDEX donation_records_date_idx ON donation_records (donation_date DESC);


-- ============================================================
-- 7. ELIGIBILITY CHECKS
-- Stores each check a user runs
-- ============================================================

CREATE TABLE eligibility_checks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          eligibility_status NOT NULL,
  reason          TEXT NOT NULL,
  eligible_after  DATE,
  answers         JSONB NOT NULL,  -- stores full questionnaire answers
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX eligibility_checks_user_idx ON eligibility_checks (user_id);
CREATE INDEX eligibility_checks_created_at_idx ON eligibility_checks (created_at DESC);


-- ============================================================
-- 8. SOS ALERTS
-- ============================================================

CREATE TABLE sos_alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blood_group      blood_group NOT NULL,
  location         GEOGRAPHY(POINT, 4326),
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  hospital_name    TEXT NOT NULL,
  contact_number   TEXT NOT NULL,
  radius_km        INTEGER NOT NULL DEFAULT 30,
  donors_notified  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sos_alerts_requester_idx ON sos_alerts (requester_id);
CREATE INDEX sos_alerts_location_idx ON sos_alerts USING GIST (location);
CREATE INDEX sos_alerts_created_at_idx ON sos_alerts (created_at DESC);


-- ============================================================
-- 9. ORGAN DONATION CONSENTS
-- ============================================================

CREATE TABLE organ_donation_consents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_donor      BOOLEAN NOT NULL DEFAULT FALSE,
  organs        TEXT[] NOT NULL DEFAULT '{}',
  consent_date  DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX organ_donation_user_idx ON organ_donation_consents (user_id);


-- ============================================================
-- 10. ALERT LOGS
-- Tracks every notification sent (for SOS misuse auditing)
-- ============================================================

CREATE TABLE alert_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sos_alert_id UUID REFERENCES sos_alerts(id) ON DELETE SET NULL,
  donor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel      TEXT NOT NULL,  -- 'push', 'in_app'
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX alert_logs_sos_idx ON alert_logs (sos_alert_id);
CREATE INDEX alert_logs_donor_idx ON alert_logs (donor_id);


-- ============================================================
-- 11. AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER blood_requests_updated_at
  BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organ_donation_updated_at
  BEFORE UPDATE ON organ_donation_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 12. AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- Creates a profile row when a user signs up via Supabase Auth
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, blood_group)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'blood_group', 'O+')::blood_group
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 13. AUTO-SET LOCATION POINT FROM LAT/LNG TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION sync_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_location_from_coords();

CREATE TRIGGER blood_requests_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION sync_location_from_coords();

CREATE TRIGGER sos_alerts_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON sos_alerts
  FOR EACH ROW EXECUTE FUNCTION sync_location_from_coords();


-- ============================================================
-- 14. HELPER FUNCTION: FIND NEARBY DONORS
-- Returns donors within a given radius (km) matching blood group
-- Usage: SELECT * FROM find_nearby_donors('O+', 12.9716, 77.5946, 30);
-- ============================================================

CREATE OR REPLACE FUNCTION find_nearby_donors(
  p_blood_group   blood_group,
  p_latitude      DOUBLE PRECISION,
  p_longitude     DOUBLE PRECISION,
  p_radius_km     INTEGER DEFAULT 30
)
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  phone           TEXT,
  blood_group     blood_group,
  push_token      TEXT,
  distance_km     DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.phone,
    p.blood_group,
    p.push_token,
    ROUND(
      (ST_Distance(
        p.location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
      ) / 1000.0)::NUMERIC, 2
    )::DOUBLE PRECISION AS distance_km
  FROM profiles p
  WHERE
    p.is_available = TRUE
    AND p.eligibility_status = 'eligible'
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
-- 15. HELPER FUNCTION: FIND NEARBY REQUESTS
-- Returns open requests within a given radius (km)
-- Usage: SELECT * FROM find_nearby_requests(12.9716, 77.5946, 50);
-- ============================================================

CREATE OR REPLACE FUNCTION find_nearby_requests(
  p_latitude   DOUBLE PRECISION,
  p_longitude  DOUBLE PRECISION,
  p_radius_km  INTEGER DEFAULT 50
)
RETURNS TABLE (
  id              UUID,
  patient_name    TEXT,
  blood_group     blood_group,
  units_needed    INTEGER,
  urgency         urgency_level,
  hospital_name   TEXT,
  contact_number  TEXT,
  status          request_status,
  is_sos          BOOLEAN,
  distance_km     DOUBLE PRECISION,
  created_at      TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.patient_name,
    r.blood_group,
    r.units_needed,
    r.urgency,
    r.hospital_name,
    r.contact_number,
    r.status,
    r.is_sos,
    ROUND(
      (ST_Distance(
        r.location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
      ) / 1000.0)::NUMERIC, 2
    )::DOUBLE PRECISION AS distance_km,
    r.created_at
  FROM blood_requests r
  WHERE
    r.status = 'open'
    AND r.location IS NOT NULL
    AND ST_DWithin(
      r.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY
    CASE r.urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
    distance_km ASC;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 16. SOS RATE LIMIT CHECK FUNCTION
-- Returns TRUE if user can trigger SOS (no SOS in last 60 mins)
-- ============================================================

CREATE OR REPLACE FUNCTION can_trigger_sos(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_sos TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO last_sos
  FROM sos_alerts
  WHERE requester_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_sos IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN (NOW() - last_sos) > INTERVAL '60 minutes';
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 17. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organ_donation_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;


-- PROFILES
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());


-- BLOOD REQUESTS
CREATE POLICY "Authenticated users can view all open requests"
  ON blood_requests FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can create requests"
  ON blood_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update own requests"
  ON blood_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Users can delete own requests"
  ON blood_requests FOR DELETE TO authenticated
  USING (requester_id = auth.uid());


-- DONOR RESPONSES
CREATE POLICY "Users can view responses to own requests or own responses"
  ON donor_responses FOR SELECT TO authenticated
  USING (
    donor_id = auth.uid()
    OR request_id IN (
      SELECT id FROM blood_requests WHERE requester_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create responses"
  ON donor_responses FOR INSERT TO authenticated
  WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Users can update own responses"
  ON donor_responses FOR UPDATE TO authenticated
  USING (donor_id = auth.uid());


-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT TO service_role WITH CHECK (TRUE);


-- DONATION RECORDS
CREATE POLICY "Users can view own donation records"
  ON donation_records FOR SELECT TO authenticated
  USING (donor_id = auth.uid());

CREATE POLICY "Users can insert own donation records"
  ON donation_records FOR INSERT TO authenticated
  WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Users can update own donation records"
  ON donation_records FOR UPDATE TO authenticated
  USING (donor_id = auth.uid());


-- ELIGIBILITY CHECKS
CREATE POLICY "Users can view own eligibility checks"
  ON eligibility_checks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert eligibility checks"
  ON eligibility_checks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- SOS ALERTS
CREATE POLICY "Authenticated users can view sos alerts"
  ON sos_alerts FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can create own sos alerts"
  ON sos_alerts FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());


-- ORGAN DONATION CONSENTS
CREATE POLICY "Users can manage own organ donation consent"
  ON organ_donation_consents FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ALERT LOGS (read-only for users, written by service role)
CREATE POLICY "Users can view own alert logs"
  ON alert_logs FOR SELECT TO authenticated
  USING (donor_id = auth.uid());


-- ============================================================
-- 18. STORAGE BUCKETS
-- Run these in Supabase Dashboard → Storage, or via SQL
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );


-- ============================================================
-- 19. REALTIME PUBLICATIONS
-- Enable realtime on key tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE blood_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE donor_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;


-- ============================================================
-- DONE — Database setup complete for Sembal Phase 1
-- ============================================================