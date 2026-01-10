-- Migration: NOVA Memory System v7.0
-- Version: 5.1
-- Description: Three-tier cognitive memory (Episodic, Procedural, Reflections)
-- Note: Vector embeddings removed - add pgvector extension later if needed

-- ============================================================================
-- EPISODIC MEMORY: What happened (events, errors, handoffs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS nova_episodic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent VARCHAR(20) NOT NULL,
    event_type VARCHAR(20) NOT NULL, -- 'task', 'error', 'handoff', 'feedback', 'decision'
    
    -- Event details
    action TEXT NOT NULL,
    context TEXT,
    outcome VARCHAR(20), -- 'success', 'failure', 'partial'
    
    -- Learning
    lesson TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Decay management
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    importance INTEGER DEFAULT 50 CHECK (importance >= 0 AND importance <= 100),
    
    -- Archival
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    
    -- Conversation context (optional link)
    conversation_id UUID REFERENCES remote_agent_conversations(id) ON DELETE SET NULL,
    session_id UUID REFERENCES remote_agent_sessions(id) ON DELETE SET NULL
);

-- ============================================================================
-- PROCEDURAL MEMORY: How we do things (patterns, workflows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS nova_procedural_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent VARCHAR(20) NOT NULL,
    
    -- The procedure
    steps JSONB NOT NULL, -- Array of {order, action, expectedOutcome, fallback}
    prerequisites JSONB DEFAULT '[]'::jsonb,
    triggers JSONB DEFAULT '[]'::jsonb, -- Keywords that trigger this procedure
    
    -- Learning metadata (Bayesian confidence)
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ
);

-- ============================================================================
-- REFLECTIONS: Learning from failures (Reflexion pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS nova_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent VARCHAR(20) NOT NULL,
    
    -- Task context
    task_type VARCHAR(100) NOT NULL,
    task_description TEXT,
    attempt_number INTEGER DEFAULT 1,
    
    -- Failure analysis
    outcome VARCHAR(20) NOT NULL,
    root_cause TEXT NOT NULL,
    specific_error TEXT,
    
    -- Correction (the learning)
    correction_action TEXT NOT NULL,
    correction_reasoning TEXT,
    correction_confidence REAL DEFAULT 0.5,
    
    -- Retrieval
    keywords JSONB DEFAULT '[]'::jsonb,
    
    -- Effectiveness tracking
    times_retrieved INTEGER DEFAULT 0,
    times_helped INTEGER DEFAULT 0,
    times_failed INTEGER DEFAULT 0,
    effectiveness_score REAL DEFAULT 0.5,
    
    -- Link to original session
    session_id UUID REFERENCES remote_agent_sessions(id) ON DELETE SET NULL
);

-- ============================================================================
-- STEERING EVOLUTION: Track how agents learn and evolve
-- ============================================================================
CREATE TABLE IF NOT EXISTS nova_steering_evolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent VARCHAR(20), -- NULL for global changes
    
    -- Change details
    change_type VARCHAR(50) NOT NULL, -- 'embody_add', 'reject_add', 'keyword_add', etc.
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    
    -- Source of change
    triggered_by UUID, -- reflection_id, pattern_id, or NULL for manual
    triggered_by_type VARCHAR(20), -- 'reflection', 'pattern', 'manual'
    confidence REAL
);

-- ============================================================================
-- KNOWLEDGE CACHE: Fast lookups for semantic knowledge
-- ============================================================================
CREATE TABLE IF NOT EXISTS nova_knowledge_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'component', 'service', 'pattern', 'decision'
    entity_name VARCHAR(255) NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    
    -- Temporal validity (bi-temporal)
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ, -- NULL = still valid
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(entity_type, entity_name, valid_from)
);

-- ============================================================================
-- AGENT STATE: Current status of each agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS nova_agent_state (
    agent VARCHAR(20) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'active', 'blocked', 'waiting'
    current_task TEXT,
    parallel_slot INTEGER,
    files_locked JSONB DEFAULT '[]'::jsonb,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    last_active TIMESTAMPTZ,
    context_snapshot JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Episodic memory indexes
CREATE INDEX IF NOT EXISTS idx_nova_episodic_agent ON nova_episodic_memory(agent);
CREATE INDEX IF NOT EXISTS idx_nova_episodic_type ON nova_episodic_memory(event_type);
CREATE INDEX IF NOT EXISTS idx_nova_episodic_timestamp ON nova_episodic_memory(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nova_episodic_outcome ON nova_episodic_memory(outcome);
CREATE INDEX IF NOT EXISTS idx_nova_episodic_archived ON nova_episodic_memory(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_nova_episodic_tags ON nova_episodic_memory USING GIN(tags);

-- Procedural memory indexes
CREATE INDEX IF NOT EXISTS idx_nova_procedural_agent ON nova_procedural_memory(agent);
CREATE INDEX IF NOT EXISTS idx_nova_procedural_confidence ON nova_procedural_memory(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_nova_procedural_triggers ON nova_procedural_memory USING GIN(triggers);

-- Reflections indexes
CREATE INDEX IF NOT EXISTS idx_nova_reflections_agent ON nova_reflections(agent);
CREATE INDEX IF NOT EXISTS idx_nova_reflections_task_type ON nova_reflections(task_type);
CREATE INDEX IF NOT EXISTS idx_nova_reflections_effectiveness ON nova_reflections(effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_nova_reflections_keywords ON nova_reflections USING GIN(keywords);

-- Knowledge cache indexes
CREATE INDEX IF NOT EXISTS idx_nova_knowledge_entity ON nova_knowledge_cache(entity_type, entity_name);
CREATE INDEX IF NOT EXISTS idx_nova_knowledge_valid ON nova_knowledge_cache(valid_to) WHERE valid_to IS NULL;

-- Steering evolution indexes
CREATE INDEX IF NOT EXISTS idx_nova_steering_agent ON nova_steering_evolution(agent);
CREATE INDEX IF NOT EXISTS idx_nova_steering_type ON nova_steering_evolution(change_type);

-- ============================================================================
-- INSERT default agent states
-- ============================================================================
INSERT INTO nova_agent_state (agent, status) VALUES 
    ('POLARIS', 'idle'),
    ('VEGA', 'idle'),
    ('SIRIUS', 'idle'),
    ('RIGEL', 'idle'),
    ('ANTARES', 'idle'),
    ('ARCTURUS', 'idle')
ON CONFLICT (agent) DO NOTHING;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE nova_episodic_memory IS 'What happened: task executions, errors, handoffs, feedback';
COMMENT ON TABLE nova_procedural_memory IS 'How we do things: learned patterns and workflows';
COMMENT ON TABLE nova_reflections IS 'Learning from failures: Reflexion-style self-improvement';
COMMENT ON TABLE nova_steering_evolution IS 'Track how agent personalities evolve over time';
COMMENT ON TABLE nova_knowledge_cache IS 'Fast semantic knowledge lookups with temporal validity';
COMMENT ON TABLE nova_agent_state IS 'Current status and context of each NOVA agent';

