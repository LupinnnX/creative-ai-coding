-- NOVA v7.0 Memory Schema
-- Run: sqlite3 .nova/nova_memory.db < .nova/schema.sql

-- Episodic Memory (What happened)
CREATE TABLE IF NOT EXISTS episodic_memory (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    context TEXT,
    outcome TEXT,
    lesson TEXT,
    tags TEXT,
    embedding BLOB,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    importance INTEGER DEFAULT 50,
    archived INTEGER DEFAULT 0,
    archived_at TEXT
);

-- Procedural Memory (How we do things)
CREATE TABLE IF NOT EXISTS procedural_memory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    agent TEXT NOT NULL,
    steps TEXT NOT NULL,
    prerequisites TEXT,
    triggers TEXT,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.5,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_used TEXT
);

-- Reflections (Learning from failures)
CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    task_type TEXT NOT NULL,
    task_description TEXT,
    attempt_number INTEGER,
    outcome TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    specific_error TEXT,
    correction_action TEXT NOT NULL,
    correction_reasoning TEXT,
    correction_confidence REAL,
    embedding BLOB,
    keywords TEXT,
    times_retrieved INTEGER DEFAULT 0,
    times_helped INTEGER DEFAULT 0,
    times_failed INTEGER DEFAULT 0,
    effectiveness_score REAL DEFAULT 0.5
);

-- Steering Evolution (Track changes)
CREATE TABLE IF NOT EXISTS steering_evolution (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    triggered_by TEXT,
    confidence REAL
);

-- Knowledge Graph Cache (for fast lookups)
CREATE TABLE IF NOT EXISTS knowledge_cache (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    properties TEXT,
    valid_from TEXT,
    valid_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Agent State (current status)
CREATE TABLE IF NOT EXISTS agent_state (
    agent TEXT PRIMARY KEY,
    status TEXT DEFAULT 'idle',
    current_task TEXT,
    parallel_slot INTEGER,
    files_locked TEXT,
    progress INTEGER DEFAULT 0,
    last_active TEXT,
    context_snapshot TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodic_agent ON episodic_memory(agent);
CREATE INDEX IF NOT EXISTS idx_episodic_type ON episodic_memory(event_type);
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memory(timestamp);
CREATE INDEX IF NOT EXISTS idx_procedural_agent ON procedural_memory(agent);
CREATE INDEX IF NOT EXISTS idx_procedural_confidence ON procedural_memory(confidence);
CREATE INDEX IF NOT EXISTS idx_reflections_agent ON reflections(agent);
CREATE INDEX IF NOT EXISTS idx_reflections_task_type ON reflections(task_type);
CREATE INDEX IF NOT EXISTS idx_reflections_effectiveness ON reflections(effectiveness_score);
CREATE INDEX IF NOT EXISTS idx_knowledge_entity ON knowledge_cache(entity_type, entity_name);
CREATE INDEX IF NOT EXISTS idx_steering_agent ON steering_evolution(agent);

-- Insert default agent states
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('POLARIS', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('VEGA', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('SIRIUS', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('RIGEL', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('ANTARES', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('ARCTURUS', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('ALDEBARAN', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('CAPELLA', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('SPICA', 'idle');
INSERT OR IGNORE INTO agent_state (agent, status) VALUES ('BETELGEUSE', 'idle');

-- Verify
SELECT 'Tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
