-- =========================================================
-- SkillTwin Database Foundation Schema (PostgreSQL)
-- Master Reference: SkillTwin Master Implementation Plan
-- =========================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Student Profile & Learning Preferences)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    education_level VARCHAR(100),
    degree VARCHAR(150),
    branch VARCHAR(150),
    semester_year VARCHAR(50),
    target_role VARCHAR(150),
    study_time_per_day VARCHAR(50),
    preferred_learning_style VARCHAR(50),
    preferred_language VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Evidence Sources Table (Resume, GitHub, Projects, Assessments)
CREATE TABLE IF NOT EXISTS evidence_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'resume', 'github', 'project', 'assessment'
    source_identifier VARCHAR(500), -- filename or repository URL
    raw_payload JSONB,
    parsed_metadata JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Skills Taxonomy Table (Canonical Skill Catalog)
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    canonical_name VARCHAR(100) NOT NULL,
    category VARCHAR(100), -- 'Frontend', 'Backend', 'Database', 'DevOps', 'Data/AI'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Living SkillTwin Table (Student Evidence-Backed Skill Profile)
CREATE TABLE IF NOT EXISTS skill_twin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency VARCHAR(50) NOT NULL, -- 'Beginner', 'Intermediate', 'Advanced'
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Percentage (0 - 100)
    reasoning TEXT NOT NULL,
    has_resume_evidence BOOLEAN DEFAULT FALSE,
    has_github_evidence BOOLEAN DEFAULT FALSE,
    has_project_evidence BOOLEAN DEFAULT FALSE,
    has_assessment_evidence BOOLEAN DEFAULT FALSE,
    evidence_details JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_id)
);

-- 5. Industry Roles Table (Curated Career Paths)
CREATE TABLE IF NOT EXISTS industry_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Role Requirements Table (Skill Benchmarks per Role)
CREATE TABLE IF NOT EXISTS role_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES industry_roles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    required_proficiency VARCHAR(50) NOT NULL, -- 'Beginner', 'Intermediate', 'Advanced'
    importance VARCHAR(50) NOT NULL, -- 'Critical', 'High', 'Medium', 'Low'
    weight NUMERIC(3, 2) DEFAULT 1.0,
    CONSTRAINT unique_role_skill UNIQUE (role_id, skill_id)
);

-- 7. Gap Reports Table (Skill Gaps & Overall Readiness)
CREATE TABLE IF NOT EXISTS gap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES industry_roles(id) ON DELETE CASCADE,
    overall_readiness_score NUMERIC(5, 2) NOT NULL,
    summary TEXT,
    gap_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Roadmaps Table (Personalized Action Plans)
CREATE TABLE IF NOT EXISTS roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES industry_roles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
    learning_plan JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Project Verifications Table (GitHub Repo Verification & Loop Closure)
CREATE TABLE IF NOT EXISTS project_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    repo_url VARCHAR(500) NOT NULL,
    verification_status VARCHAR(50) NOT NULL, -- 'Verified', 'Needs Improvement', 'Failed'
    evidence_extracted JSONB,
    reasoning TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Essential Curated Industry Roles
INSERT INTO industry_roles (role_name, description)
VALUES 
    ('Full-Stack Developer', 'Designs and builds complete web applications from frontend to backend database.'),
    ('Frontend Developer', 'Builds responsive, high-performance user interfaces and client applications.'),
    ('Backend Developer', 'Engineers robust server APIs, microservices, databases, and system architecture.'),
    ('Software Engineer', 'Applies software engineering principles to build scalable software systems.'),
    ('Data Analyst', 'Analyzes structured and unstructured data to derive actionable insights.'),
    ('ML Engineer', 'Builds and deploys machine learning models and intelligent data pipelines.')
ON CONFLICT (role_name) DO NOTHING;

-- Seed Essential Canonical Skills
INSERT INTO skills (name, canonical_name, category, description)
VALUES
    ('JavaScript', 'JavaScript', 'Frontend', 'Core web scripting language'),
    ('TypeScript', 'TypeScript', 'Frontend', 'Typed superset of JavaScript'),
    ('React', 'React', 'Frontend', 'Component-based UI library'),
    ('Python', 'Python', 'Backend', 'General purpose language for backend and AI'),
    ('FastAPI', 'FastAPI', 'Backend', 'High-performance Python web framework'),
    ('Node.js', 'Node.js', 'Backend', 'JavaScript server runtime environment'),
    ('PostgreSQL', 'PostgreSQL', 'Database', 'Relational database management system'),
    ('Docker', 'Docker', 'DevOps', 'Containerization platform'),
    ('REST APIs', 'REST APIs', 'Backend', 'Representational State Transfer API architecture')
ON CONFLICT (name) DO NOTHING;
