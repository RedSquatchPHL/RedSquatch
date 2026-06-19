-- Required by connect-pg-simple for Express session persistence
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    VARCHAR    NOT NULL COLLATE "default",
  "sess"   JSON       NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  user_id INTEGER DEFAULT 1,
  context VARCHAR(20) DEFAULT 'personal',
  category_id INTEGER,
  target_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id),
  title TEXT NOT NULL,
  sequence_order INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'todo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  is_maintenance BOOLEAN DEFAULT false,
  goal_id INTEGER REFERENCES goals(id),
  status VARCHAR(20) DEFAULT 'todo',
  retention_days INTEGER DEFAULT 30,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS client_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES client_users(id),
  goal_id INTEGER REFERENCES goals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
