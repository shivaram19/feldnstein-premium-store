-- Purge automated-test fixtures (tags: E2E-, DUP-E2E, CRUD-, XSS probe names) from any
-- environment they landed in. Runs child-first so FK constraints are satisfied.
-- Tag patterns match only machine-generated test data (see scripts/e2e-business-flows.py,
-- scripts/e2e-crud-audit.py); no legitimate business row carries these markers.

-- allocations and count lines referencing tagged levels/plans
DELETE FROM order_allocation WHERE stock_level_id IN (
    SELECT id FROM stock_level WHERE batch_id IN (SELECT id FROM production_batch WHERE batch_code LIKE '%E2E-%')
);
DELETE FROM stock_count_line WHERE plan_id IN (
    SELECT id FROM stock_count_plan WHERE scope_desc LIKE '%E2E%'
);
DELETE FROM stock_count_plan WHERE scope_desc LIKE '%E2E%';

-- procurement children
DELETE FROM goods_receipt_line WHERE grn_id IN (
    SELECT gr.id FROM goods_receipt gr JOIN purchase_order po ON gr.po_id = po.id
    WHERE po.po_number LIKE '%E2E-%' OR po.notes LIKE '%E2E%'
);
DELETE FROM goods_receipt WHERE po_id IN (
    SELECT id FROM purchase_order WHERE po_number LIKE '%E2E-%' OR notes LIKE '%E2E%'
);
DELETE FROM purchase_order_line WHERE po_id IN (
    SELECT id FROM purchase_order WHERE po_number LIKE '%E2E-%' OR notes LIKE '%E2E%'
);
DELETE FROM purchase_order WHERE po_number LIKE '%E2E-%' OR notes LIKE '%E2E%';

-- production children, then the batches themselves
DELETE FROM quality_check WHERE batch_id IN (SELECT id FROM production_batch WHERE batch_code LIKE '%E2E-%');
DELETE FROM bottling_run WHERE batch_id IN (SELECT id FROM production_batch WHERE batch_code LIKE '%E2E-%');
DELETE FROM bull_work_log WHERE batch_id IN (SELECT id FROM production_batch WHERE batch_code LIKE '%E2E-%');
DELETE FROM stock_movement WHERE movement_no LIKE '%E2E-%' OR movement_no LIKE 'MOV-CRUD%'
   OR reason LIKE '%E2E%' OR reference_id LIKE '%E2E%';
DELETE FROM stock_level WHERE batch_id IN (SELECT id FROM production_batch WHERE batch_code LIKE '%E2E-%')
   OR variant_id IN (SELECT id FROM product_variant WHERE sku LIKE '%E2E%' OR sku LIKE '%CRUD%')
   OR warehouse_id IN (SELECT id FROM warehouse WHERE code LIKE '%E2E%' OR code LIKE '%CRUD%');
DELETE FROM production_batch WHERE batch_code LIKE '%E2E-%';

-- master data
DELETE FROM seed_procurement WHERE farmer_id IN (
    SELECT id FROM supplier WHERE code LIKE '%E2E%' OR name LIKE '%<script>%'
);
DELETE FROM supplier WHERE code LIKE '%E2E%' OR name LIKE '%<script>%';
DELETE FROM product_variant WHERE sku LIKE '%E2E%' OR sku LIKE '%CRUD%' OR barcode LIKE '%CRUD%';
DELETE FROM oil_product WHERE code LIKE '%E2E%' OR code LIKE '%CRUD%';
DELETE FROM warehouse WHERE code LIKE '%E2E%' OR code LIKE '%CRUD%';
