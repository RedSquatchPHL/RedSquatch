CREATE TABLE IF NOT EXISTS minecraft_worlds (
  id SERIAL PRIMARY KEY,
  slot VARCHAR(50) NOT NULL UNIQUE CHECK (slot IN ('active', 'inactive_1', 'inactive_2')),
  world_name VARCHAR(255),
  seed VARCHAR(100),
  last_backup_date TIMESTAMP,
  size_mb INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_minecraft_worlds_slot ON minecraft_worlds(slot);

-- Initialize the 3 world slots
INSERT INTO minecraft_worlds (slot, world_name, seed, created_at, updated_at)
VALUES
  ('active', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inactive_1', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inactive_2', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slot) DO NOTHING;
