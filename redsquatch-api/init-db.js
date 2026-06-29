#!/usr/bin/env node
const { Pool } = require('pg');

const db = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    await db.query('SELECT 1');
    console.log('✓ Connected');

    // Create session table first (used by express-session)
    console.log('Creating session table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
    `);
    console.log('✓ Session table ready');

    // Create client_users table
    console.log('Creating client_users table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS client_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ client_users table ready');

    // Create goal_categories table
    console.log('Creating goal_categories table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS goal_categories (
        id SERIAL PRIMARY KEY,
        parent_context VARCHAR(50) NOT NULL,
        sub_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ goal_categories table ready');

    // Create goals table
    console.log('Creating goals table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        title TEXT NOT NULL,
        description TEXT,
        context VARCHAR(50) DEFAULT 'personal',
        category_id INTEGER REFERENCES goal_categories(id) ON DELETE SET NULL,
        target_date DATE,
        status VARCHAR(50) DEFAULT 'draft',
        progress INTEGER DEFAULT 0,
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ goals table ready');

    // Create research_entries table
    console.log('Creating research_entries table...');
    await db.query(`
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
    `);
    console.log('✓ research_entries table ready');

    // Insert test user
    console.log('Inserting test user...');
    await db.query(`
      INSERT INTO client_users (username, password_hash)
      VALUES ('acme_client', '$2b$10$p8DMKQQiF.xfhKJqAzjFRe2U3Aif16SIvpXSGCMGKW3fymbcpM8.K')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('✓ Test user ready');

    console.log('\n✓ Database initialization complete!');
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    console.error(err.stack);
    await db.end();
    process.exit(1);
  }
}

initDatabase();
