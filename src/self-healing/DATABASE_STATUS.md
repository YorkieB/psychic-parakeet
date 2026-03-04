# Self-Healing Infrastructure Database Status

## ✅ Database Tables Created

All required database tables for the self-healing infrastructure have been successfully created:

### 1. `agent_states` Table
**Purpose**: Tracks current state of all agents

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `agent_name` (VARCHAR(100) NOT NULL, UNIQUE)
- `status` (VARCHAR(20) NOT NULL) - spawning, active, idle, error, respawning, killed, offline
- `pid` (INTEGER) - Process ID if separate process
- `thread_id` (INTEGER) - Thread ID if threaded
- `spawned_at` (TIMESTAMPTZ NOT NULL)
- `last_ping` (TIMESTAMPTZ NOT NULL)
- `metadata` (JSONB DEFAULT '{}'::jsonb)

**Indexes**:
- `idx_agent_states_name` - On agent_name
- `idx_agent_states_status` - On status
- `idx_agent_states_last_ping` - On last_ping

**Current Status**: ✅ Created, 0 rows (will populate when agents are monitored)

---

### 2. `agent_lifecycle_events` Table
**Purpose**: Event log for all agent lifecycle events

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `agent_name` (VARCHAR(100) NOT NULL)
- `event_type` (VARCHAR(50) NOT NULL) - agent_spawned, agent_ready, agent_active, agent_idle, agent_error, agent_crashed, agent_respawning, agent_killed
- `timestamp` (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- `details` (JSONB DEFAULT '{}'::jsonb)
- `error_message` (TEXT)

**Indexes**:
- `idx_agent_lifecycle_agent_name` - On agent_name
- `idx_agent_lifecycle_event_type` - On event_type
- `idx_agent_lifecycle_timestamp` - On timestamp

**Current Status**: ✅ Created, 0 rows (will populate as events occur)

---

### 3. `agent_spawn_history` Table
**Purpose**: Tracks spawn and crash history for each agent

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `agent_name` (VARCHAR(100) NOT NULL, UNIQUE)
- `spawn_count` (INTEGER DEFAULT 1)
- `crash_count` (INTEGER DEFAULT 0)
- `last_spawn` (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- `last_crash` (TIMESTAMPTZ)
- `spawn_duration_ms` (INTEGER)

**Indexes**:
- `idx_agent_spawn_history_name` - On agent_name
- `idx_agent_spawn_history_last_spawn` - On last_spawn

**Current Status**: ✅ Created, 0 rows (will populate when agents spawn)

---

## 📊 Database Statistics

**Tables Created**: 3/3 ✅
**Indexes Created**: 13/13 ✅
**Total Rows**: 0 (empty - ready for data)

## 🔍 Verification Commands

### Check Database Status
```bash
npx ts-node scripts/check-agent-database.ts
```

### Run Migration (if needed)
```bash
npx ts-node scripts/run-agent-migration.ts
```

## 📝 Notes

1. **sensor_readings table**: The migration attempts to add `agent_name` and `agent_metrics` columns to the `sensor_readings` table if it exists. If the table doesn't exist yet, this is OK - the columns will be added when the table is created.

2. **Data Population**: Tables are currently empty. Data will be populated when:
   - Agents are spawned (agent_states, agent_spawn_history)
   - Lifecycle events occur (agent_lifecycle_events)
   - Health checks run (updates last_ping in agent_states)

3. **Automatic Migration**: The migration runs automatically when the self-healing infrastructure initializes in `initializeBackgroundServices()`.

## 🎯 Next Steps

1. Start the Jarvis system - agents will be monitored and data will populate
2. Check agent status via API: `GET /health/agents`
3. View lifecycle events: Query `agent_lifecycle_events` table
4. Monitor spawn history: Query `agent_spawn_history` table

## 📈 Expected Data Growth

- **agent_states**: 1 row per agent (29 rows max)
- **agent_lifecycle_events**: Grows with each event (spawn, crash, respawn, etc.)
- **agent_spawn_history**: 1 row per agent (29 rows max, updated on spawn/crash)

All tables are ready and waiting for agent activity! 🚀
