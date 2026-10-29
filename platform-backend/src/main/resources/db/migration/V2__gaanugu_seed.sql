-- Realistic gaanugu seed: master data + one batch mid-pipeline.
-- Safe to re-run: H2 dev DB is recreated per boot; Flyway runs once per fresh DB.

INSERT INTO oil_product (code, name, oil_source, shelf_life_days, nutritional_info, active) VALUES
('OIL-GN', 'Cold-Pressed Groundnut Oil', 'GROUNDNUT', 365, 'Wood-pressed; single-filtered; no refining.', TRUE),
('OIL-SS', 'Cold-Pressed Sesame (Gingelly) Oil', 'SESAME', 365, 'Bull-pressed white sesame; sediment-settled.', TRUE),
('OIL-CN', 'Cold-Pressed Coconut Oil', 'COCONUT', 365, 'Wet-milled copra; cold-pressed; unrefined.', TRUE);

INSERT INTO product_variant (product_id, sku, size_ml, bottle_type, cap_type, barcode, mrp) VALUES
(1, 'GN-250-G-ROPP', 250, 'GLASS', 'ROPP', '8900001001250', 220.00),
(1, 'GN-500-G-ROPP', 500, 'GLASS', 'ROPP', '8900001001500', 420.00),
(1, 'GN-1000-G-ROPP', 1000, 'GLASS', 'ROPP', '8900001002000', 800.00),
(2, 'SS-500-G-ROPP', 500, 'GLASS', 'ROPP', '8900002001500', 540.00),
(3, 'CN-500-G-LUG', 500, 'GLASS', 'LUG', '8900003001500', 380.00);

INSERT INTO warehouse (code, name, type, address, manager_name, manager_phone) VALUES
('MOTHADAKA', 'Mothadaka Production Unit', 'PRODUCTION', 'Mothadaka, Andhra Pradesh', 'Srinivas Rao', '9000000001'),
('VZG-HUB', 'Visakhapatnam Fulfilment Hub', 'FULFILMENT', 'Madhurawada, Visakhapatnam', 'Lakshmi', '9000000002');

INSERT INTO supplier (code, type, name, phone, address, bank_details, gst, active) VALUES
('F-001', 'FARMER', 'Apparao Naidu', '9100000001', 'Cheepurupalli', 'SBIN0001234 / 30112233445', '37ABCDE1234F1Z5', TRUE),
('F-002', 'FARMER', 'Lavanya Devi', '9100000002', 'Vizianagaram', 'SBIN0005678 / 30112233446', '37ABCDE1234F1Z6', TRUE),
('P-001', 'PACKAGING', 'Sri Lakshmi Glass Works', '9200000001', 'Rajahmundry', 'ICIC0004321 / 50112233447', '37FGHIJ5678K1Z1', TRUE);

INSERT INTO bull (code, name, breed, health_status, daily_work_limit_hrs, rest_after_days, acquisition_cost, last_vet_check, next_vet_check, monthly_feed_cost, active) VALUES
('B-01', 'Nandi', 'Ongole', 'FIT', 4.0, 3, 65000.00, DATE '2026-10-01', DATE '2026-11-01', 4500.00, TRUE),
('B-02', 'Bheemudu', 'Ongole', 'RESTING', 4.0, 3, 58000.00, DATE '2026-09-20', DATE '2026-10-20', 4500.00, TRUE);

INSERT INTO press (code, type, beam_condition, stone_condition, capacity_litres, year_built, last_maintenance, next_maintenance_due, status) VALUES
('PR-01', 'Wooden gaanugu — rosewood beam', 'GOOD', 'FAIR', 12.00, 2019, DATE '2026-09-15', DATE '2026-12-15', 'ACTIVE'),
('PR-02', 'Wooden gaanugu — rosewood beam', 'GOOD', 'GOOD', 12.00, 2021, DATE '2026-08-10', DATE '2026-11-10', 'ACTIVE');

INSERT INTO press_operator (code, name, phone, aadhaar, address, wage_type, rate, bank_account, join_date, active) VALUES
('OP-01', 'Rambabu', '9300000001', '123456789012', 'Mothadaka', 'DAILY', 600.00, 'SBIN0001234 / 40112233448', DATE '2022-06-01', TRUE),
('OP-02', 'Nageswara Rao', '9300000002', '123456789013', 'Mothadaka', 'DAILY', 600.00, 'SBIN0001234 / 40112233449', DATE '2023-01-15', TRUE);

INSERT INTO app_user (name, email, phone, role, warehouse_id, active) VALUES
('Srinivas Rao', 'admin@feldnstein.in', '9000000001', 'ADMIN', 1, TRUE),
('Rambabu', 'ops@feldnstein.in', '9300000001', 'OPERATOR', 1, TRUE);

INSERT INTO seed_procurement (procurement_date, seed_type, farmer_id, qty_kg, rate_per_kg, total_cost, quality_grade, payment_status, transport_cost) VALUES
(DATE '2026-10-20', 'Groundnut (Java)', 1, 200.00, 95.00, 19000.00, 'A', 'PENDING', 800.00),
(DATE '2026-10-22', 'White sesame', 2, 80.00, 210.00, 16800.00, 'A', 'PAID', 500.00);

INSERT INTO production_batch (batch_code, product_id, press_date, seed_type, seed_qty_kg, seed_cost_total, farmer_id, bull_id, operator_id, press_id, oil_yield_litres, spillage_litres, status, handler_wage_cost, bull_feed_cost, press_maintenance_cost, stone_wear_cost, shed_cost, packaging_cost, weather_notes, best_before_date) VALUES
('B-2026-101', 1, DATE '2026-10-24', 'Groundnut (Java)', 120.00, 11400.00, 1, 1, 1, 1, 38.5, 0.5, 'QC_PENDING', 600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Clear morning, low humidity', DATE '2027-10-24');

INSERT INTO bull_work_log (work_date, bull_id, batch_id, start_time, end_time, hours_worked, handler_id, health_observation) VALUES
(DATE '2026-10-24', 1, 1, TIME '08:30', TIME '12:00', 3.50, 1, 'Normal gait, good appetite');

INSERT INTO operator_attendance (work_date, operator_id, status, check_in, check_out, hours_worked, press_id, batches_worked, overtime_hrs) VALUES
(DATE '2026-10-24', 1, 'PRESENT', TIME '08:00', TIME '12:30', 4.50, 1, 'B-2026-101', 0.50);

INSERT INTO quality_check (batch_id, stage, moisture_pct, foreign_matter_pct, aflatoxin_ppb, pesticide_residue, oil_temp_celsius, seal_integrity_ok, overall_pass, notes, photo_refs, checked_by, checked_at) VALUES
(1, 'PRE_RELEASE', 6.20, 0.10, 4.50, 'BELOW_LODQ', 36.80, TRUE, TRUE, 'Within FSSAI limits; temperature confirms cold-press claim.', 'qc/b-2026-101-lab.jpg', 'Dr. Priya (lab)', TIMESTAMP '2026-10-25 10:30:00');

INSERT INTO stock_level (variant_id, batch_id, warehouse_id, on_hand, reserved, unit_cost, expiry_date) VALUES
(2, 1, 1, 60, 0, 320.00, DATE '2027-10-24');
