-- 1. Create goal_categories first
CREATE TABLE IF NOT EXISTS goal_categories (
  id SERIAL PRIMARY KEY,
  parent_context VARCHAR(20) NOT NULL CHECK (parent_context IN ('work', 'home', 'personal')),
  sub_type VARCHAR(100) NOT NULL,
  UNIQUE(parent_context, sub_type)
);

INSERT INTO goal_categories (parent_context, sub_type) VALUES
  ('work', 'Career Growth'),
  ('work', 'Project Delivery'),
  ('work', 'Skills Development'),
  ('work', 'Financial'),
  ('home', 'Home Improvement'),
  ('home', 'Family'),
  ('home', 'Finances'),
  ('home', 'Maintenance'),
  ('personal', 'Health & Fitness'),
  ('personal', 'Learning'),
  ('personal', 'Relationships'),
  ('personal', 'Creative')
ON CONFLICT DO NOTHING;

-- 2. Migrate goals table
ALTER TABLE goals RENAME COLUMN name TO title;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS context VARCHAR(20) DEFAULT 'personal';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES goal_categories(id);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE goals SET status = 'active'   WHERE status = 'needs_attention';
UPDATE goals SET status = 'achieved' WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_goals_context  ON goals(context);
CREATE INDEX IF NOT EXISTS idx_goals_user_id  ON goals(user_id);

-- 3. Migrate milestones table
ALTER TABLE milestones RENAME COLUMN name TO title;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE milestones SET is_completed = true, completed_at = updated_at WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);

-- 4. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  is_maintenance BOOLEAN NOT NULL DEFAULT false,
  goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  retention_days INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id  ON tasks(goal_id);

-- 5. Create maintenance_logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_task_id ON maintenance_logs(task_id);

-- 6. Seed sample tasks
INSERT INTO tasks (title, is_maintenance, status) VALUES
  ('Review Q2 OKR progress', false, 'todo'),
  ('Update resume & portfolio', false, 'in_progress'),
  ('Weekly house cleaning', true, 'todo'),
  ('Oil change', true, 'todo'),
  ('Grocery run', true, 'done');
