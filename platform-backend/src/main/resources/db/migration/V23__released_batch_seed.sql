-- Released batches for the storefront's batch-genealogy display
-- (citations-verified §D, tension 2: provenance is the premium defense).
-- The V2 batch stays mid-pipeline (QC_PENDING) to exercise the lifecycle.

INSERT INTO production_batch (batch_code, product_id, press_date, seed_type, seed_qty_kg, seed_cost_total, farmer_id, bull_id, operator_id, press_id, oil_yield_litres, spillage_litres, status, handler_wage_cost, bull_feed_cost, press_maintenance_cost, stone_wear_cost, shed_cost, packaging_cost, weather_notes, best_before_date) VALUES
('B-2026-042', 1, DATE '2026-11-12', 'Groundnut (Java)', 140.00, 13300.00, 1, 1, 1, 1, 31.2, 0.4, 'RELEASED', 600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Cool morning, ideal pressing weather', DATE '2027-11-12'),
('B-2026-043', 2, DATE '2026-11-05', 'Black sesame', 95.00, 16150.00, 1, 1, 1, 1, 18.4, 0.3, 'RELEASED', 600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Dry afternoon', DATE '2027-11-05'),
('B-2026-041', 3, DATE '2026-10-28', 'Sun-dried copra', 110.00, 8800.00, 1, 1, 1, 1, 22.0, 0.2, 'RELEASED', 600.00, 150.00, 80.00, 40.00, 100.00, 0, 'Humid day, extra settling time', DATE '2027-10-28');
