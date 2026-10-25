INSERT INTO Product (id, name, sku, category, price, stockQty) VALUES
  (next value for product_seq, 'Leather Weekender', 'FW-LW-001', 'Bags', 249.00, 12),
  (next value for product_seq, 'Merino Scarf', 'FW-MS-002', 'Accessories', 79.00, 40),
  (next value for product_seq, 'Cashmere Throw', 'FW-CT-003', 'Home', 189.00, 7);

INSERT INTO LoyaltyAccount (id, memberEmail, name, tier, pointsBalance) VALUES
  (next value for loyaltyaccount_seq, 'ada@example.com', 'Ada Feld', 'GOLD', 1250),
  (next value for loyaltyaccount_seq, 'ben@example.com', 'Ben Stone', 'BRONZE', 120);
