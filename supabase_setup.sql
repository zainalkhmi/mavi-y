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
  content_json JSONB,
  steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table for storing motion analysis projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT UNIQUE NOT NULL,
  video_name TEXT,
  folder_id UUID, -- Will add foreign key later to avoid circular dependency in scripts
  measurements JSONB,
  narration TEXT,
  swcs_data JSONB,
  standard_work_layout_data JSONB,
  facility_layout_data JSONB,
  video_url TEXT, -- For Supabase Storage
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

-- Create youtube_links table for storing training/help videos
CREATE TABLE IF NOT EXISTS youtube_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT,
  module_id TEXT,
  lesson_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for youtube_links
ALTER TABLE youtube_links ENABLE ROW LEVEL SECURITY;

-- Policies for youtube_links
DROP POLICY IF EXISTS "Public read youtube_links" ON youtube_links;
DROP POLICY IF EXISTS "Public insert youtube_links" ON youtube_links;
DROP POLICY IF EXISTS "Public update youtube_links" ON youtube_links;
DROP POLICY IF EXISTS "Public delete youtube_links" ON youtube_links;

CREATE POLICY "Public read youtube_links" ON youtube_links FOR SELECT USING (true);
CREATE POLICY "Public insert youtube_links" ON youtube_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update youtube_links" ON youtube_links FOR UPDATE USING (true);
CREATE POLICY "Public delete youtube_links" ON youtube_links FOR DELETE USING (true);

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_string TEXT UNIQUE NOT NULL,
  email TEXT,
  machine_id TEXT, -- Requested/Target hardware
  status TEXT DEFAULT 'active',
  type TEXT DEFAULT 'permanent',
  bound_machine_id TEXT, -- Actual hardware bound
  bound_ip TEXT,
  bound_country TEXT,
  last_active_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create license_requests table
CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  machine_id TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_requests ENABLE ROW LEVEL SECURITY;

-- Policies for licenses
DROP POLICY IF EXISTS "Public read licenses" ON licenses;
DROP POLICY IF EXISTS "Public insert licenses" ON licenses;
DROP POLICY IF EXISTS "Public update licenses" ON licenses;
DROP POLICY IF EXISTS "Public delete licenses" ON licenses;

CREATE POLICY "Public read licenses" ON licenses FOR SELECT USING (true);
CREATE POLICY "Public insert licenses" ON licenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update licenses" ON licenses FOR UPDATE USING (true);
CREATE POLICY "Public delete licenses" ON licenses FOR DELETE USING (true);

-- Policies for license_requests
DROP POLICY IF EXISTS "Public read license_requests" ON license_requests;
DROP POLICY IF EXISTS "Public insert license_requests" ON license_requests;
DROP POLICY IF EXISTS "Public update license_requests" ON license_requests;
DROP POLICY IF EXISTS "Public delete license_requests" ON license_requests;

CREATE POLICY "Public read license_requests" ON license_requests FOR SELECT USING (true);
CREATE POLICY "Public insert license_requests" ON license_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update license_requests" ON license_requests FOR UPDATE USING (true);
CREATE POLICY "Public delete license_requests" ON license_requests FOR DELETE USING (true);

-- Create cloud_installers table
CREATE TABLE IF NOT EXISTS cloud_installers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT,
  platform TEXT, -- 'windows', 'macos', 'linux'
  url TEXT NOT NULL,
  is_latest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_visibility table
CREATE TABLE IF NOT EXISTS menu_visibility (
  path TEXT PRIMARY KEY,
  visible BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cloud_installers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_visibility ENABLE ROW LEVEL SECURITY;

-- Policies for cloud_installers
DROP POLICY IF EXISTS "Public read cloud_installers" ON cloud_installers;
DROP POLICY IF EXISTS "Public insert cloud_installers" ON cloud_installers;
DROP POLICY IF EXISTS "Public update cloud_installers" ON cloud_installers;
DROP POLICY IF EXISTS "Public delete cloud_installers" ON cloud_installers;

CREATE POLICY "Public read cloud_installers" ON cloud_installers FOR SELECT USING (true);
CREATE POLICY "Public insert cloud_installers" ON cloud_installers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cloud_installers" ON cloud_installers FOR UPDATE USING (true);
CREATE POLICY "Public delete cloud_installers" ON cloud_installers FOR DELETE USING (true);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT DEFAULT 'projects', -- 'projects', 'datasets', etc.
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_name TEXT,
  clip_id TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  zip_url TEXT, -- URL to Supabase Storage if binary used
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cameras table
CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT,
  type TEXT,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- Policies for folders
DROP POLICY IF EXISTS "Public read folders" ON folders;
DROP POLICY IF EXISTS "Public insert folders" ON folders;
DROP POLICY IF EXISTS "Public update folders" ON folders;
DROP POLICY IF EXISTS "Public delete folders" ON folders;

CREATE POLICY "Public read folders" ON folders FOR SELECT USING (true);
CREATE POLICY "Public insert folders" ON folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update folders" ON folders FOR UPDATE USING (true);
CREATE POLICY "Public delete folders" ON folders FOR DELETE USING (true);

-- Policies for datasets
DROP POLICY IF EXISTS "Public read datasets" ON datasets;
DROP POLICY IF EXISTS "Public insert datasets" ON datasets;
DROP POLICY IF EXISTS "Public update datasets" ON datasets;
DROP POLICY IF EXISTS "Public delete datasets" ON datasets;

CREATE POLICY "Public read datasets" ON datasets FOR SELECT USING (true);
CREATE POLICY "Public insert datasets" ON datasets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update datasets" ON datasets FOR UPDATE USING (true);
CREATE POLICY "Public delete datasets" ON datasets FOR DELETE USING (true);

-- Policies for cameras
DROP POLICY IF EXISTS "Public read cameras" ON cameras;
DROP POLICY IF EXISTS "Public insert cameras" ON cameras;
DROP POLICY IF EXISTS "Public update cameras" ON cameras;
DROP POLICY IF EXISTS "Public delete cameras" ON cameras;

CREATE POLICY "Public read cameras" ON cameras FOR SELECT USING (true);
CREATE POLICY "Public insert cameras" ON cameras FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cameras" ON cameras FOR UPDATE USING (true);
CREATE POLICY "Public delete cameras" ON cameras FOR DELETE USING (true);

-- =====================================================
-- Idempotent Column Updates (Ensures columns exist if table was created earlier)
-- =====================================================

-- Add missing columns to manuals if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manuals' AND column_name='content_json') THEN
        ALTER TABLE manuals ADD COLUMN content_json JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manuals' AND column_name='steps') THEN
        ALTER TABLE manuals ADD COLUMN steps JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manuals' AND column_name='folder_id') THEN
        ALTER TABLE manuals ADD COLUMN folder_id UUID;
    END IF;
END $$;

-- Add missing columns to projects if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='folder_id') THEN
        ALTER TABLE projects ADD COLUMN folder_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='video_url') THEN
        ALTER TABLE projects ADD COLUMN video_url TEXT;
    END IF;
END $$;

-- Add missing columns to licenses if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='email') THEN
        ALTER TABLE licenses ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='machine_id') THEN
        ALTER TABLE licenses ADD COLUMN machine_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='bound_machine_id') THEN
        ALTER TABLE licenses ADD COLUMN bound_machine_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='bound_ip') THEN
        ALTER TABLE licenses ADD COLUMN bound_ip TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='bound_country') THEN
        ALTER TABLE licenses ADD COLUMN bound_country TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='last_active_at') THEN
        ALTER TABLE licenses ADD COLUMN last_active_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add missing columns to datasets if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='datasets' AND column_name='folder_id') THEN
        ALTER TABLE datasets ADD COLUMN folder_id UUID;
    END IF;
END $$;

-- Add missing columns to license_requests (should be new but for safety)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_requests' AND column_name='email') THEN
        ALTER TABLE license_requests ADD COLUMN email TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Master indexes
CREATE INDEX IF NOT EXISTS idx_manuals_document_number ON manuals(document_number);
CREATE INDEX IF NOT EXISTS idx_manuals_category ON manuals(category);
CREATE INDEX IF NOT EXISTS idx_manuals_updated_at ON manuals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuals_type_updated_at ON manuals(type, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_links_category ON youtube_links(category);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key_string);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_license_requests_status ON license_requests(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_name ON projects(project_name);
CREATE INDEX IF NOT EXISTS idx_measurements_video_name ON measurements(video_name);
CREATE INDEX IF NOT EXISTS idx_action_recognition_project ON action_recognition(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_section ON folders(section);
CREATE INDEX IF NOT EXISTS idx_datasets_folder ON datasets(folder_id);
CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);

-- Create dynamic_translations table
CREATE TABLE IF NOT EXISTS dynamic_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_string TEXT UNIQUE NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}', -- { "en": "...", "tr": "..." }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dynamic_translations ENABLE ROW LEVEL SECURITY;

-- Policies for dynamic_translations
DROP POLICY IF EXISTS "Public read translations" ON dynamic_translations;
DROP POLICY IF EXISTS "Public insert translations" ON dynamic_translations;
DROP POLICY IF EXISTS "Public update translations" ON dynamic_translations;
DROP POLICY IF EXISTS "Public delete translations" ON dynamic_translations;

CREATE POLICY "Public read translations" ON dynamic_translations FOR SELECT USING (true);
CREATE POLICY "Public insert translations" ON dynamic_translations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update translations" ON dynamic_translations FOR UPDATE USING (true);
CREATE POLICY "Public delete translations" ON dynamic_translations FOR DELETE USING (true);
-- Create vsm_data table
CREATE TABLE IF NOT EXISTS vsm_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  thumbnail TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vsm_data ENABLE ROW LEVEL SECURITY;

-- Policies for vsm_data
DROP POLICY IF EXISTS "Public read vsm_data" ON vsm_data;
DROP POLICY IF EXISTS "Public insert vsm_data" ON vsm_data;
DROP POLICY IF EXISTS "Public update vsm_data" ON vsm_data;
DROP POLICY IF EXISTS "Public delete vsm_data" ON vsm_data;

CREATE POLICY "Public read vsm_data" ON vsm_data FOR SELECT USING (true);
CREATE POLICY "Public insert vsm_data" ON vsm_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vsm_data" ON vsm_data FOR UPDATE USING (true);
CREATE POLICY "Public delete vsm_data" ON vsm_data FOR DELETE USING (true);

-- Indexes for vsm_data
CREATE INDEX IF NOT EXISTS idx_vsm_data_folder ON vsm_data(folder_id);
CREATE INDEX IF NOT EXISTS idx_vsm_data_name ON vsm_data(name);
