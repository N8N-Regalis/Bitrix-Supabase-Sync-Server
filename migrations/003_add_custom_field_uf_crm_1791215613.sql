-- Migration: Add custom field column to deals table
-- Description: Adds UF_CRM_1791215613 column for querying and filtering
-- Version: 3.0.0

ALTER TABLE deals ADD COLUMN IF NOT EXISTS uf_crm_1791215613 VARCHAR(500);

-- Add index for faster queries on custom field
CREATE INDEX IF NOT EXISTS idx_deals_uf_crm_1791215613 ON deals(uf_crm_1791215613);

-- Add column comment
COMMENT ON COLUMN deals.uf_crm_1791215613 IS 'Custom field UF_CRM_1791215613 from Bitrix24';
