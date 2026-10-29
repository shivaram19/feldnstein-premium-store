-- Hibernate id-sequence pre-creation (ADR-0006 canonical-schema discipline).
-- Hibernate's id strategy on H2 is SEQUENCE-per-table: the sequence name is the exact
-- table name (as declared in @Table, or the entity name for the demo domain) + "_SEQ",
-- increment 50 (JPA pooled allocation default), starting at 1 when Hibernate creates it.
-- Flyway seeds occupy low ids, so runtime inserts would collide with seeded rows.
-- Pre-creating these sequences at 1000 makes every table safe for runtime inserts;
-- Hibernate's schema update finds them present and leaves them untouched.
-- Names verified empirically against Hibernate's DDL on H2 2.3 (Quarkus 3.20).

-- Gaanugu domain (names follow the @Table declarations):
CREATE SEQUENCE IF NOT EXISTS oil_product_SEQ            START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS product_variant_SEQ        START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS warehouse_SEQ              START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS supplier_SEQ               START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS bull_SEQ                   START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS press_operator_SEQ         START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS press_SEQ                  START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS app_user_SEQ               START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS production_batch_SEQ       START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS bottling_run_SEQ           START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS bull_work_log_SEQ          START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS operator_attendance_SEQ    START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS quality_check_SEQ          START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS stock_level_SEQ            START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS stock_movement_SEQ         START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS seed_procurement_SEQ       START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS purchase_order_SEQ         START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS purchase_order_line_SEQ    START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS goods_receipt_SEQ          START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS goods_receipt_line_SEQ     START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS price_config_SEQ           START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS alert_rule_SEQ             START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS alert_SEQ                  START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS app_setting_SEQ            START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS audit_event_SEQ            START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS stock_count_plan_SEQ       START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS stock_count_line_SEQ       START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS report_schedule_SEQ        START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS report_run_SEQ             START WITH 1000 INCREMENT BY 50;

-- Demo domain (ADR-0004; sequence names follow the entity names, demo tables have no @Table):
CREATE SEQUENCE IF NOT EXISTS product_SEQ                START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS stockmovement_SEQ          START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS purchaseorder_SEQ          START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS loyaltyaccount_SEQ         START WITH 1000 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS loyaltytransaction_SEQ     START WITH 1000 INCREMENT BY 50;
