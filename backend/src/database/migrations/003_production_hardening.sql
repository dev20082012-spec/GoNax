-- Migration 003: Production Hardening, Authentication, Access Control & Audit Schema

-- Users table for authentication and role-based access control
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'public_user', -- 'public_user', 'researcher', 'admin_maintainer'
    organization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Governance Audit Logs for administrative actions (model approvals, retirements, dataset registrations)
CREATE TABLE IF NOT EXISTS governance_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    action VARCHAR(100) NOT NULL, -- 'MODEL_APPROVED', 'MODEL_RETIRED', 'DATASET_REGISTERED', 'BACKUP_CREATED', etc.
    actor_id VARCHAR(36),
    actor_role VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'model', 'dataset', 'system'
    entity_id VARCHAR(100) NOT NULL,
    details_json TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_governance_audit_entity ON governance_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_created ON governance_audit_logs(created_at DESC);

-- Alter tree_observations and predictions to include user_id and is_demo if PostgreSQL
-- For SQLite / Local database, tables will dynamically support these fields.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tree_observations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tree_observations' AND column_name = 'user_id') THEN
            ALTER TABLE tree_observations ADD COLUMN user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE tree_observations ADD COLUMN session_id VARCHAR(64);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'predictions' AND column_name = 'user_id') THEN
            ALTER TABLE predictions ADD COLUMN user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE predictions ADD COLUMN session_id VARCHAR(64);
            ALTER TABLE predictions ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;
