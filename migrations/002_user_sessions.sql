CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_email ON user_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
