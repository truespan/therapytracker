-- Migration: Add Blog System
-- This migration adds blog posting functionality with conditional permissions for therapists

-- Add can_post_blogs permission column to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS can_post_blogs BOOLEAN DEFAULT FALSE;

-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category VARCHAR(100),
    author_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    author_type VARCHAR(20) NOT NULL DEFAULT 'partner',
    featured_image_url TEXT,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(published, published_at);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at);

-- Add comment for documentation
COMMENT ON COLUMN partners.can_post_blogs IS 'Permission flag to allow therapist to post blogs';
COMMENT ON TABLE blogs IS 'Blog posts and news articles created by therapists with blog posting permission';








