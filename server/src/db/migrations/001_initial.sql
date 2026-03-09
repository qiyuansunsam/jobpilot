CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id),
  cv_filename     TEXT,
  cv_path         TEXT,
  cv_text         TEXT,
  additional_info TEXT,
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS platform_credentials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  platform        TEXT    NOT NULL DEFAULT 'linkedin',
  encrypted_email TEXT    NOT NULL,
  encrypted_pass  TEXT    NOT NULL,
  iv              TEXT    NOT NULL,
  auth_tag        TEXT    NOT NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS job_preferences (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  job_titles  TEXT    DEFAULT '[]',
  locations   TEXT    DEFAULT '[]',
  salary_min  INTEGER,
  salary_max  INTEGER,
  experience  TEXT,
  industries  TEXT    DEFAULT '[]',
  updated_at  TEXT    DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  job_title         TEXT    NOT NULL,
  company           TEXT,
  job_url           TEXT,
  job_description   TEXT,
  generated_cover   TEXT,
  generated_answers TEXT,
  status            TEXT    DEFAULT 'generated',
  applied_at        TEXT,
  created_at        TEXT    DEFAULT (datetime('now'))
);
