CREATE TABLE IF NOT EXISTS research_entries (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  topic_name VARCHAR(255) NOT NULL,
  requested_by VARCHAR(255),
  date_requested DATE,
  evaluated_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Not Started',
  executive_summary TEXT,
  definition TEXT,
  core_mechanics TEXT,
  pricing_cost_structure TEXT,
  use_case_1 TEXT,
  use_case_2 TEXT,
  current_vs_new_process TEXT,
  pros_strengths TEXT,
  cons_risks_limitations TEXT,
  recommendation VARCHAR(50),
  next_steps TEXT,
  converted_to_goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  flagged_for_deletion BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_client_id ON research_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_research_flagged ON research_entries(flagged_for_deletion);
CREATE INDEX IF NOT EXISTS idx_research_status ON research_entries(status);
