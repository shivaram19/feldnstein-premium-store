-- Richer operational seed: batches across the lifecycle, bottling, stock, ledger, QC backlog.
-- Appends to V2 (Flyway append-only). H2 dev DB is recreated per boot, so V2+V3 replay in order.

-- Batches across the full pipeline (B-2026-101 QC_PENDING came from V2)
INSERT INTO production_batch (batch_code, product_id, press_date, seed_type, seed_qty_kg, seed_cost_total, farmer_id, bull_id, operator_id, press_id, oil_yield_litres, spillage_litres, status, handler_wage_cost, bull_feed_cost, press_maintenance_cost, stone_wear_cost, shed_cost, packaging_cost, weather_notes, best_before_date) VALUES
('B-2026-097', 1, DATE '2026-10-18', 'Groundnut (Java)', 150.00, 14250.00, 1, 1, 1, 1, 47.0, 0.8, 'RELEASED',    600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Dry week, good pressing', DATE '2027-10-18'),
('B-2026-098', 2, DATE '2026-10-20', 'White sesame',     90.00, 18900.00, 2, 1, 2, 2, 26.4, 0.4, 'QC_PASSED',   600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Light drizzle afternoon', DATE '2027-10-20'),
('B-2026-099', 3, DATE '2026-10-22', 'Copra (ball)',    100.00, 12000.00, 1, 2, 1, 1, 31.2, 0.6, 'BOTTLING',    600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Humid — extended settling', DATE '2027-10-22'),
('B-2026-100', 1, DATE '2026-10-23', 'Groundnut (Java)', 110.00, 10450.00, 2, 1, 1, 1, 35.1, 0.5, 'BOTTLING_READY', 600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Clear', DATE '2027-10-23'),
('B-2026-102', 2, DATE '2026-10-25', 'White sesame',     75.00, 15750.00, 2, 2, 2, 2, 22.0, 0.3, 'SEDIMENTATION', 600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Overcast', DATE '2027-10-25'),
('B-2026-103', 3, DATE '2026-10-26', 'Copra (ball)',     95.00, 11400.00, 1, 1, 2, 1, NULL,  NULL, 'PRESSING',   600.00, 150.00, 80.00, 40.00, 100.00, 0, 'In progress this morning', NULL);

-- Bottling runs for finished/passed batches
INSERT INTO bottling_run (batch_id, variant_id, bottling_date, bottles_filled, bottles_damaged, bottles_rejected, warehouse_id, bin_location, sticker_from, sticker_to) VALUES
(2, 2, DATE '2026-10-21', 90, 1, 0, 1, 'A-01', 'S-0001', 'S-0090'),
(3, 4, DATE '2026-10-24', 48, 2, 1, 1, 'A-02', 'S-0091', 'S-0138'),
(4, 5, DATE '2026-10-25', 55, 0, 0, 2, 'B-01', 'S-0139', 'S-0193');

-- Stock levels: healthy, low, and near-expiry positions
INSERT INTO stock_level (variant_id, batch_id, warehouse_id, on_hand, reserved, unit_cost, expiry_date) VALUES
(2, 2, 1,  89,  5, 310.00, DATE '2027-10-18'),
(4, 3, 1,  45, 10, 395.00, DATE '2027-10-20'),
(5, 4, 2,  55,  0, 285.00, DATE '2026-11-15'),
(1, 2, 1,   4,  0, 165.00, DATE '2027-10-18'),
(3, 2, 2, 120, 20, 590.00, DATE '2027-10-18'),
(2, 6, 1,  30,  0, 320.00, DATE '2027-04-26');

-- Immutable movement ledger (transfers, production-in, adjustment)
INSERT INTO stock_movement (movement_no, moved_at, type, variant_id, batch_id, from_warehouse_id, to_warehouse_id, quantity, unit_cost, reference_type, reference_id, reason, performed_by) VALUES
('MV-0001', TIMESTAMP '2026-10-21 14:00:00', 'PRODUCTION_IN',  2, 2, NULL, 1,  90, 310.00, 'BATCH', 'B-2026-097', 'Bottling run output', 'Rambabu'),
('MV-0002', TIMESTAMP '2026-10-24 11:30:00', 'PRODUCTION_IN',  4, 3, NULL, 1,  48, 395.00, 'BATCH', 'B-2026-099', 'Bottling run output', 'Nageswara Rao'),
('MV-0003', TIMESTAMP '2026-10-25 09:15:00', 'TRANSFER_OUT',   5, 4, 1,  NULL, 55, 285.00, 'TRANSFER', 'TRF-01', 'Dispatch to VZG hub', 'Srinivas Rao'),
('MV-0004', TIMESTAMP '2026-10-25 17:40:00', 'TRANSFER_IN',    5, 4, NULL, 2,   55, 285.00, 'TRANSFER', 'TRF-01', 'Received at VZG hub', 'Lakshmi'),
('MV-0005', TIMESTAMP '2026-10-26 08:05:00', 'ADJUSTMENT_OUT', 1, 2, 1,  NULL,  2, 165.00, 'ADJUSTMENT', 'ADJ-01', 'Broken bottles in transit', 'Rambabu'),
('MV-0006', TIMESTAMP '2026-10-20 16:20:00', 'PROCUREMENT_IN', 2, 2, NULL, 1, 200, NULL,   'BATCH', 'SP-001', 'Seed stock received (non-bottle UOM)', 'Srinivas Rao');

-- QC history: a pass, a fail (quarantine candidate), and the pending one is B-2026-101 from V2
INSERT INTO quality_check (batch_id, stage, moisture_pct, foreign_matter_pct, aflatoxin_ppb, pesticide_residue, oil_temp_celsius, seal_integrity_ok, overall_pass, notes, photo_refs, checked_by, checked_at) VALUES
(2, 'PRE_RELEASE', 5.80, 0.05, 3.10, 'BELOW_LODQ', 35.20, TRUE, TRUE,  'Clean batch; temp well under 40°C.', 'qc/b-2026-097-lab.jpg', 'Dr. Priya (lab)', TIMESTAMP '2026-10-19 11:00:00'),
(3, 'PRE_RELEASE', 7.40, 0.60, 18.90, 'DETECTED',   38.10, TRUE, FALSE, 'Aflatoxin above 15ppb limit — hold batch, re-test after re-settling.', 'qc/b-2026-099-fail.jpg', 'Dr. Priya (lab)', TIMESTAMP '2026-10-23 15:30:00'),
(4, 'POST_PRESS',  6.00, 0.10, NULL,  'PENDING',    37.50, NULL, TRUE,  'Sensory pass; lab panel awaited.', NULL, 'Srinivas Rao', TIMESTAMP '2026-10-23 18:00:00');

-- Extra procurement for spend analytics
INSERT INTO seed_procurement (procurement_date, seed_type, farmer_id, qty_kg, rate_per_kg, total_cost, quality_grade, payment_status, transport_cost) VALUES
(DATE '2026-10-24', 'Copra (ball)', 1, 300.00, 120.00, 36000.00, 'B', 'PENDING', 1200.00),
(DATE '2026-10-26', 'Groundnut (Java)', 2, 250.00, 98.00, 24500.00, 'A', 'PENDING', 900.00);

-- Packaging purchase order + goods receipt (3-way match demo)
INSERT INTO purchase_order (po_number, supplier_id, delivery_warehouse_id, order_date, expected_delivery, status, notes) VALUES
('PO-2026-011', 3, 1, DATE '2026-10-15', DATE '2026-10-27', 'PARTIALLY_RECEIVED', '500ml amber glass restock');

INSERT INTO purchase_order_line (po_id, item_type, spec, quantity, unit_price, tax_pct) VALUES
(1, 'BOTTLE', '500ml amber glass, 28mm neck', 1000, 8.50, 18.00),
(1, 'CAP',    '28mm ROPP gold',                1000, 1.20, 18.00);

INSERT INTO goods_receipt (grn_number, po_id, receipt_date, delivery_note_no, condition_note, received_by) VALUES
('GRN-2026-006', 1, DATE '2026-10-26', 'DN-8841', 'One carton smashed in transit', 'Rambabu');

INSERT INTO goods_receipt_line (grn_id, po_line_id, qty_received, qty_damaged, qty_short) VALUES
(1, 1, 950, 40, 10),
(1, 2, 1000, 0, 0);
