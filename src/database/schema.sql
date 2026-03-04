-- Jarvis AI Assistant Database Schema
-- PostgreSQL 12+

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
  current_topic TEXT,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(255) UNIQUE NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Entities table (for reference resolution)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('topic', 'person', 'concept', 'location', 'other')),
  first_mentioned TIMESTAMP DEFAULT NOW(),
  last_mentioned TIMESTAMP DEFAULT NOW(),
  frequency INTEGER DEFAULT 1,
  aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  UNIQUE(session_id, name)
);

CREATE INDEX IF NOT EXISTS idx_entities_session_id ON entities(session_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);

-- Reasoning traces table
CREATE TABLE IF NOT EXISTS reasoning_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(255) UNIQUE NOT NULL,
  session_id VARCHAR(255),
  user_id VARCHAR(255) NOT NULL,
  user_input TEXT NOT NULL,
  goal JSONB NOT NULL,
  reasoning_steps JSONB NOT NULL,
  execution_plan JSONB NOT NULL,
  agent_outputs JSONB NOT NULL,
  final_response TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  duration_ms INTEGER,
  criticality VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reasoning_traces_trace_id ON reasoning_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_session_id ON reasoning_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_user_id ON reasoning_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_created_at ON reasoning_traces(created_at);

-- Research cache table
CREATE TABLE IF NOT EXISTS research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  query TEXT NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  inputs JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_cache_key ON research_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_research_cache_expires_at ON research_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_research_cache_agent ON research_cache(agent_id, action);

-- Query response cache table
CREATE TABLE IF NOT EXISTS query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  user_input TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at ON query_cache(expires_at);

-- Analytics table (optional - for system monitoring)
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  event_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id VARCHAR(255) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255),
  threat_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  blocked BOOLEAN NOT NULL DEFAULT false,
  input_hash VARCHAR(64),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user_threat ON security_events(user_id, threat_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity) WHERE severity IN ('high', 'critical');

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id VARCHAR(255) NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  last_request TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tool_name, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Suspicious users table
CREATE TABLE IF NOT EXISTS suspicious_users (
  user_id VARCHAR(255) PRIMARY KEY,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  attack_count INTEGER NOT NULL DEFAULT 1,
  auto_blocked BOOLEAN DEFAULT false,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- Redaction log (for compliance)
CREATE TABLE IF NOT EXISTS redaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255),
  redaction_type VARCHAR(50) NOT NULL,
  original_hash VARCHAR(64),
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redaction_log_user ON redaction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_redaction_log_type ON redaction_log(redaction_type);

-- Function to cleanup expired records
CREATE OR REPLACE FUNCTION cleanup_expired_records() RETURNS void AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM sessions WHERE expires_at < NOW();
  
  -- Delete expired research cache
  DELETE FROM research_cache WHERE expires_at < NOW();
  
  -- Delete expired query cache
  DELETE FROM query_cache WHERE expires_at < NOW();
  
  -- Clean up old rate limit windows (older than 1 hour)
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Clean up old security events (older than 90 days)
  DELETE FROM security_events WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
