-- =====================================================
-- MAVi Motion Study - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Create manuals table for storing work instructions
CREATE TABLE IF NOT EXISTS manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  document_number TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'Draft',
  author TEXT,
  summary TEXT,
  difficulty TEXT DEFAULT 'Moderate',
  time_required TEXT,
  category TEXT,
  industry TEXT,
  type TEXT DEFAULT 'manual',
  steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table for storing motion analysis projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT UNIQUE NOT NULL,
  video_name TEXT,
  measurements JSONB,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ DEFAULT NOW()
);

-- Create measurements table for storing measurement sessions
CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  measurements JSONB,
  narration TEXT,
  cycle_data JSONB,
  ergonomic_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create action_recognition table for ML model results
CREATE TABLE IF NOT EXISTS action_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  video_name TEXT,
  actions JSONB,
  model_type TEXT,
  confidence_threshold FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_recognition ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid errors on re-run)
DROP POLICY IF EXISTS "Public read manuals" ON manuals;
DROP POLICY IF EXISTS "Public insert manuals" ON manuals;
DROP POLICY IF EXISTS "Public update manuals" ON manuals;
DROP POLICY IF EXISTS "Public delete manuals" ON manuals;

DROP POLICY IF EXISTS "Public read projects" ON projects;
DROP POLICY IF EXISTS "Public insert projects" ON projects;
DROP POLICY IF EXISTS "Public update projects" ON projects;
DROP POLICY IF EXISTS "Public delete projects" ON projects;

DROP POLICY IF EXISTS "Public read measurements" ON measurements;
DROP POLICY IF EXISTS "Public insert measurements" ON measurements;
DROP POLICY IF EXISTS "Public update measurements" ON measurements;
DROP POLICY IF EXISTS "Public delete measurements" ON measurements;

DROP POLICY IF EXISTS "Public read action_recognition" ON action_recognition;
DROP POLICY IF EXISTS "Public insert action_recognition" ON action_recognition;
DROP POLICY IF EXISTS "Public update action_recognition" ON action_recognition;
DROP POLICY IF EXISTS "Public delete action_recognition" ON action_recognition;

-- Create policies for public access
CREATE POLICY "Public read manuals" ON manuals FOR SELECT USING (true);
CREATE POLICY "Public insert manuals" ON manuals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update manuals" ON manuals FOR UPDATE USING (true);
CREATE POLICY "Public delete manuals" ON manuals FOR DELETE USING (true);

CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Public delete projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Public read measurements" ON measurements FOR SELECT USING (true);
CREATE POLICY "Public insert measurements" ON measurements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update measurements" ON measurements FOR UPDATE USING (true);
CREATE POLICY "Public delete measurements" ON measurements FOR DELETE USING (true);

CREATE POLICY "Public read action_recognition" ON action_recognition FOR SELECT USING (true);
CREATE POLICY "Public insert action_recognition" ON action_recognition FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update action_recognition" ON action_recognition FOR UPDATE USING (true);
CREATE POLICY "Public delete action_recognition" ON action_recognition FOR DELETE USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_manuals_document_number ON manuals(document_number);
CREATE INDEX IF NOT EXISTS idx_manuals_category ON manuals(category);
CREATE INDEX IF NOT EXISTS idx_projects_project_name ON projects(project_name);
CREATE INDEX IF NOT EXISTS idx_measurements_video_name ON measurements(video_name);
CREATE INDEX IF NOT EXISTS idx_action_recognition_project ON action_recognition(project_id);
