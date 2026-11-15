-- Kitchen Reserve subscription (ADR-0025 follow-on): carts carry a subscribe
-- flag; subscribed orders get 10% off subtotal with GST scaled to the
-- discounted base. Columns are additive with safe defaults — existing rows
-- and all current flows are unaffected.

ALTER TABLE cart ADD COLUMN subscribe BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE customer_order ADD COLUMN subscription BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customer_order ADD COLUMN discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0;
