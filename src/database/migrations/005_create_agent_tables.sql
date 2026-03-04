-- Migration: Create agent self-healing tables
-- Adds tables for agent state tracking, lifecycle events, and spawn history

-- Agent states table
CREATE TABLE IF NOT EXISTS agent_states (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  pid INTEGER,
  thread_id INTEGER,
  spawned_at TIMESTAMPTZ NOT NULL,
  last_ping TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(agent_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_states_name ON agent_states(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_states_status ON agent_states(status);
CREATE INDEX IF NOT EXISTS idx_agent_states_last_ping ON agent_states(last_ping);

-- Agent lifecycle events table
CREATE TABLE IF NOT EXISTS agent_lifecycle_events (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_agent_name ON agent_lifecycle_events(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_event_type ON agent_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_timestamp ON agent_lifecycle_events(timestamp);

-- Agent spawn history table
CREATE TABLE IF NOT EXISTS agent_spawn_history (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  spawn_count INTEGER DEFAULT 1,
  crash_count INTEGER DEFAULT 0,
  last_spawn TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_crash TIMESTAMPTZ,
  spawn_duration_ms INTEGER,
  UNIQUE(agent_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_spawn_history_name ON agent_spawn_history(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_spawn_history_last_spawn ON agent_spawn_history(last_spawn);

-- Update sensor_readings table to support per-agent metrics
-- Check if sensor_readings table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sensor_readings') THEN
    -- Add agent_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sensor_readings' AND column_name = 'agent_name') THEN
      ALTER TABLE sensor_readings ADD COLUMN agent_name VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_sensor_readings_agent_name ON sensor_readings(agent_name);
    END IF;

    -- Add agent_metrics column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sensor_readings' AND column_name = 'agent_metrics') THEN
      ALTER TABLE sensor_readings ADD COLUMN agent_metrics JSONB;
    END IF;
  END IF;
END $$;
