-- ADR-0030 (verified-buyer reviews + farmer genealogy).
-- order_code: optional self-declared order code at submission time; when it
-- matches a real order line for the product, verified_buyer is set and the
-- storefront renders a "Verified buyer" badge. Anonymous reviews keep NULL
-- and verified_buyer FALSE — moderation (ADR-0028) remains the gate.

ALTER TABLE product_review ADD COLUMN order_code VARCHAR(24);
ALTER TABLE product_review ADD COLUMN verified_buyer BOOLEAN NOT NULL DEFAULT FALSE;
