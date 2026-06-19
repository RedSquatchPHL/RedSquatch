# RedSquatch Lincoln Work Logs Feature

## Task
Build the API endpoint + React component for Lincoln Work Logs intake form.

## Schema (Already Created)
```sql
CREATE TABLE lincoln_work_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  project VARCHAR(255),
  intake_type VARCHAR(50) DEFAULT 'work' CHECK (intake_type IN ('work', 'research')),
  hours DECIMAL(5,2),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Build Requirements

### 1. Express API Endpoints
- `POST /api/lincoln/logs` — Create entry
- `GET /api/lincoln/logs` — List all entries (with filters: date range, intake_type, status)
- `PUT /api/lincoln/logs/:id` — Update entry
- `DELETE /api/lincoln/logs/:id` — Delete entry

### 2. React Component
- Form with fields: date, project, intake_type (dropdown: work/research), hours, notes, status
- List view showing recent entries (table format)
- Copper/Obsidian design system (use existing Shadcn components)
- No full-page nav — render in center pane (same as Goals/Sports widgets)

### 3. Integration
- Add "Work Logs" section to left sidebar (collapsible, like Goals/Sports)
- Click entry → render detail view in center pane
- Integrate with existing session auth

## Constraints
- Use existing `pg` client (no knex)
- bcrypt passwords already hashed (user auth separate)
- Coolify postgres: coolify db, user coolify
- No breaking changes to existing API structure
