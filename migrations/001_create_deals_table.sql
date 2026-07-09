-- Migration: Create deals table
-- Description: Creates the deals table for storing Bitrix24 CRM deal data
-- Version: 1.0.0

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  -- Primary key from Bitrix24
  deal_id INTEGER PRIMARY KEY,
  
  -- Deal basic information
  title VARCHAR(500) NOT NULL,
  stage_id VARCHAR(50),
  category_id INTEGER,
  
  -- Assigned and related entities
  assigned_by_id INTEGER,
  company_id INTEGER,
  contact_id INTEGER,
  
  -- Financial information
  opportunity NUMERIC(18, 2),
  currency_id VARCHAR(10),
  
  -- Timestamps from Bitrix24
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Deal status
  is_closed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  
  -- Raw JSON data from Bitrix24 for reference
  raw_json JSONB,
  
  -- Sync tracking timestamps
  created_on_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_on_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_by_id ON deals(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_category_id ON deals(category_id);
CREATE INDEX IF NOT EXISTS idx_deals_is_closed ON deals(is_closed);
CREATE INDEX IF NOT EXISTS idx_deals_is_won ON deals(is_won);

-- Create GIN index on raw_json for JSON queries
CREATE INDEX IF NOT EXISTS idx_deals_raw_json ON deals USING GIN (raw_json);

-- Add table comment
COMMENT ON TABLE deals IS 'Stores synchronized deal data from Bitrix24 CRM';

-- Add column comments
COMMENT ON COLUMN deals.deal_id IS 'Primary key from Bitrix24 (ID field)';
COMMENT ON COLUMN deals.title IS 'Deal title from Bitrix24';
COMMENT ON COLUMN deals.stage_id IS 'Deal stage ID from Bitrix24';
COMMENT ON COLUMN deals.category_id IS 'Deal category ID from Bitrix24';
COMMENT ON COLUMN deals.assigned_by_id IS 'ID of the user assigned to the deal';
COMMENT ON COLUMN deals.company_id IS 'Associated company ID from Bitrix24';
COMMENT ON COLUMN deals.contact_id IS 'Primary contact ID from Bitrix24';
COMMENT ON COLUMN deals.opportunity IS 'Deal monetary value';
COMMENT ON COLUMN deals.currency_id IS 'Currency code for the opportunity amount';
COMMENT ON COLUMN deals.created_at IS 'Deal creation timestamp from Bitrix24';
COMMENT ON COLUMN deals.updated_at IS 'Deal last update timestamp from Bitrix24';
COMMENT ON COLUMN deals.closed_at IS 'Deal closing timestamp from Bitrix24';
COMMENT ON COLUMN deals.is_closed IS 'Whether the deal is closed (from Bitrix24 CLOSED field)';
COMMENT ON COLUMN deals.is_won IS 'Whether the deal was won (derived from STAGE_SEMANTIC_ID)';
COMMENT ON COLUMN deals.raw_json IS 'Complete raw JSON data from Bitrix24 API';
COMMENT ON COLUMN deals.created_on_sync IS 'Timestamp when record was first synced to database';
COMMENT ON COLUMN deals.updated_on_sync IS 'Timestamp when record was last synced to database';

-- Create trigger to automatically update updated_on_sync
CREATE OR REPLACE FUNCTION update_updated_on_sync_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_on_sync = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deals_updated_on_sync
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_on_sync_column();
