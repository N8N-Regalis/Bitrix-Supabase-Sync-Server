-- Migration: Add custom field column to deals table
-- Description: Adds UF_CRM_1768236671239 column for querying and filtering
-- Version: 2.0.0

ALTER TABLE deals ADD COLUMN IF NOT EXISTS uf_crm_1768236671239 VARCHAR(500);

-- Create index for faster queries and filtering
CREATE INDEX IF NOT EXISTS idx_deals_uf_crm_1768236671239 ON deals(uf_crm_1768236671239);

-- Add column comment
COMMENT ON COLUMN deals.uf_crm_1768236671239 IS 'Custom field UF_CRM_1768236671239 from Bitrix24';
