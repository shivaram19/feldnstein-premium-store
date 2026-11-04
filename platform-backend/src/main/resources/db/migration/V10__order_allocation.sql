-- Order stock allocations (DDD spec 2026-11-04): records exactly which stock
-- positions reserved which quantities at checkout, so release (cancel) and
-- deduct (ship) replay the same positions instead of re-walking FEFO.

CREATE TABLE order_allocation (
  id            BIGINT NOT NULL PRIMARY KEY,
  order_id      BIGINT NOT NULL,
  stock_level_id BIGINT NOT NULL,
  qty           INT    NOT NULL,
  CONSTRAINT fk_order_allocation_order FOREIGN KEY (order_id) REFERENCES customer_order (id)
);
CREATE SEQUENCE IF NOT EXISTS order_allocation_SEQ START WITH 1000 INCREMENT BY 50;
