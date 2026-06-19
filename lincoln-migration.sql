-- Lincoln Work Logs: create table + add intake_type column
-- Run once against the Coolify postgres DB (coolify db, user coolify)

CREATE TABLE IF NOT EXISTS lincoln_work_logs (
  id         SERIAL PRIMARY KEY,
  date       DATE         NOT NULL,
  project    VARCHAR(255),
  intake_type VARCHAR(50) NOT NULL DEFAULT 'work'
             CHECK (intake_type IN ('work', 'research')),
  hours      DECIMAL(5,2),
  notes      TEXT,
  status     VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- If the table already exists without intake_type:
ALTER TABLE lincoln_work_logs
  ADD COLUMN IF NOT EXISTS intake_type VARCHAR(50) NOT NULL DEFAULT 'work'
  CHECK (intake_type IN ('work', 'research'));

CREATE INDEX IF NOT EXISTS idx_lincoln_logs_date        ON lincoln_work_logs(date);
CREATE INDEX IF NOT EXISTS idx_lincoln_logs_intake_type ON lincoln_work_logs(intake_type);
CREATE INDEX IF NOT EXISTS idx_lincoln_logs_status      ON lincoln_work_logs(status);
