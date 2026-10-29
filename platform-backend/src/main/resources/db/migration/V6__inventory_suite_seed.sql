-- Inventory suite seed (ADR-0008..0011): alert rules, settings, sample alerts/audit,
-- a completed count plan, and due report schedules (the scheduler materialises runs on boot).

-- Alert rules
INSERT INTO alert_rule (rule_type, scope_ref, threshold_value, active) VALUES
('LOW_STOCK',  'ALL', 20, TRUE),
('NEAR_EXPIRY', 'ALL', 30, TRUE),
('QC_OVERDUE',  'ALL',  3, TRUE);

-- Pre-materialised alerts matching the seeded stock positions.
-- V2 seeds stock_level id 1; V3 seeds ids 2-7: SL-5 = GN-250 (low), SL-4 = CN-500 (near expiry).
INSERT INTO alert (rule_id, alert_type, severity, message, ref_type, ref_id, status, created_at, resolved_at) VALUES
(1, 'LOW_STOCK',   'CRITICAL', 'GN-250 available 4 < threshold 20',              'STOCK_LEVEL', 'SL-5', 'OPEN',     TIMESTAMP '2026-10-27 08:00:00', NULL),
(2, 'NEAR_EXPIRY', 'WARNING',  'CN-500 expires 2026-11-15 (within 30 days)',      'STOCK_LEVEL', 'SL-4', 'OPEN',     TIMESTAMP '2026-10-27 08:00:00', NULL),
(3, 'QC_OVERDUE',  'WARNING',  'B-2026-101 in QC_PENDING since 2026-10-16',       'BATCH',       'B-2026-101', 'OPEN', TIMESTAMP '2026-10-27 08:00:00', NULL),
(1, 'LOW_STOCK',   'WARNING',  'GN-250 dipped below threshold — reorder landed',  'STOCK_LEVEL', 'SL-5', 'RESOLVED', TIMESTAMP '2026-10-20 08:00:00', TIMESTAMP '2026-10-22 10:00:00');

-- Settings (General / Reorder / Expiry / Bull & Press config)
INSERT INTO app_setting (setting_key, setting_value, value_type, description) VALUES
('general.company_name',            'Feldnstein Gaanugu Oils', 'STRING',  'Displayed across reports and the admin header'),
('general.default_warehouse',       'WH-MOTHADAKA',            'STRING',  'Warehouse code used as fallback in reports'),
('reorder.default_threshold',       '20',                      'INTEGER', 'Default available-units threshold for low-stock alerts'),
('reorder.auto_suggest_qty',        '100',                     'INTEGER', 'Suggested reorder quantity shown on low-stock alerts'),
('expiry.warning_days',             '30',                      'INTEGER', 'Flag stock expiring within this many days'),
('expiry.block_sale_days',          '7',                       'INTEGER', 'Block sales of stock expiring within this many days'),
('bull.max_daily_hours',            '4.0',                     'DECIMAL', 'Animal-welfare limit: max working hours per bull per day'),
('bull.rest_after_days',            '3',                       'INTEGER', 'Mandatory rest days after consecutive work days'),
('press.maintenance_interval_days', '90',                      'INTEGER', 'Days between scheduled press maintenance');

-- Sample audit trail
INSERT INTO audit_event (actor, action, entity_type, entity_id, detail_json, at) VALUES
('admin',    'STOCK_ADJUSTMENT',    'StockService', 'MV-0005', '{"stockLevelId":4,"adjustedQty":4,"type":"DAMAGE","reason":"Broken bottles in transit"}', TIMESTAMP '2026-10-26 08:05:00'),
('ops',      'STOCK_TRANSFER',      'StockService', 'TRF-01',  '{"stockLevelId":3,"toWarehouseId":2,"quantity":55}',                                          TIMESTAMP '2026-10-25 09:15:00'),
('admin',    'COUNT_PLAN_RECONCILE','StockCountResource', 'CNT-2026-001', '{"adjustmentsPosted":2}',                                                   TIMESTAMP '2026-10-19 17:30:00');

-- One completed count plan (variance on lines 1 and 3) waiting to be shown in reconciliation
INSERT INTO stock_count_plan (plan_code, scope_desc, warehouse_id, status, created_by, planned_date, completed_at) VALUES
('CNT-2026-001', 'Weekly count — Mothadaka A-rack', 1, 'COMPLETED', 'admin', DATE '2026-10-19', TIMESTAMP '2026-10-19 17:00:00');

INSERT INTO stock_count_line (plan_id, stock_level_id, system_qty, counted_qty, variance, counted_by) VALUES
(1, 2, 89, 88, -1, 'Rambabu'),
(1, 3, 45, 45,  0, 'Rambabu'),
(1, 4, 55, 54, -1, 'Lakshmi');

-- Due report schedules: the daily one is overdue so the scheduler produces a run on first boot
INSERT INTO report_schedule (name, report_type, params_json, frequency, next_run, active) VALUES
('Daily Inventory Snapshot', 'INVENTORY_SUMMARY', NULL,        'DAILY',  DATE '2026-10-27', TRUE),
('Weekly FEFO Expiry',       'EXPIRY_FEFO',       NULL,        'WEEKLY', DATE '2026-11-01', TRUE),
('Monthly Procurement Spend','PROCUREMENT_SPEND', NULL,        'MONTHLY',DATE '2026-11-01', TRUE);
