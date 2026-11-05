-- Optimistic-locking version columns for entities that gained @Version.
-- IF NOT EXISTS: hibernate-orm.database.generation=update may already have added
-- the column in some environments; existing rows must never hold a NULL version.
ALTER TABLE stock_level ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE customer_order ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

UPDATE stock_level SET version = 0 WHERE version IS NULL;
UPDATE customer_order SET version = 0 WHERE version IS NULL;
