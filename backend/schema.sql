CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reports (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  waste_type   TEXT NOT NULL CHECK (waste_type IN ('plastic','glass','paper','metal','organic','ewaste','construction','hazardous','mixed')),
  volume_value NUMERIC(12,2) NOT NULL CHECK (volume_value > 0 AND volume_value <= 100000),
  volume_unit  TEXT NOT NULL CHECK (volume_unit IN ('m3','kg','ton','bag','piece')),
  lat          DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng          DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  address      TEXT NOT NULL DEFAULT '' CHECK (char_length(address) <= 200),
  description  TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  photo_path   TEXT,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','cleaned','hidden')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleaned_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS reports_geo_idx     ON reports (lat, lng);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_user_idx    ON reports (user_id);

CREATE TABLE IF NOT EXISTS report_confirmations (
  report_id  BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);

CREATE TABLE IF NOT EXISTS report_events (
  id          BIGSERIAL PRIMARY KEY,
  report_id   BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status  TEXT NOT NULL,
  new_status  TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  actor_role  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_events_report_idx ON report_events (report_id, created_at);
