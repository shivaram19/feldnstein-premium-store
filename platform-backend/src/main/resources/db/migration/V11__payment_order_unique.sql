-- One payment attempt per order: retry paths (checkoutParams/demoCapture initiate
-- when no payment exists) must fail loudly at the database instead of silently
-- duplicating a money attempt for the same order.
ALTER TABLE payment ADD CONSTRAINT uk_payment_order UNIQUE (order_id);
