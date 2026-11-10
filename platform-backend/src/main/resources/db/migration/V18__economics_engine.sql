-- Economics engine (ADR-0020): per-product absorption-costing parameters (the
-- owner's forecast workbook as data), margin-governed price rules, and oil-cake
-- byproduct sales that credit the cost per litre. Also records cake yield at batch
-- level. Sequences pre-created at 1000/50 (ADR-0006 canonical-schema discipline);
-- ANSI SQL only, valid on PostgreSQL and the H2 dev/test profile.

CREATE TABLE product_economics (
  id                            BIGINT          NOT NULL PRIMARY KEY,
  product_id                    BIGINT          NOT NULL,
  trips_per_day                 INT             NOT NULL,
  output_pct                    NUMERIC(5, 4)   NOT NULL,
  raw_material_kg_per_trip      NUMERIC(10, 2)  NOT NULL,
  material_cost_per_kg_override NUMERIC(12, 2),
  daily_wages                   NUMERIC(12, 2)  NOT NULL,
  wage_days_per_year            INT             NOT NULL DEFAULT 365,
  yearly_fodder                 NUMERIC(14, 2)  NOT NULL,
  bottles_per_litre             NUMERIC(8, 2)   NOT NULL,
  bottle_cost_paise             BIGINT          NOT NULL,
  shop_allocation_per_year      NUMERIC(14, 2)  NOT NULL,
  setup_cost                    NUMERIC(14, 2)  NOT NULL,
  depreciation_years            INT             NOT NULL,
  version                       BIGINT          NOT NULL DEFAULT 0,
  updated_at                    TIMESTAMP       NOT NULL,
  CONSTRAINT uk_product_economics_product UNIQUE (product_id),
  CONSTRAINT fk_product_economics_product FOREIGN KEY (product_id) REFERENCES oil_product (id)
);
CREATE SEQUENCE IF NOT EXISTS product_economics_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE price_rule (
  id                BIGINT        NOT NULL PRIMARY KEY,
  product_id        BIGINT        NOT NULL,
  target_margin_pct NUMERIC(5, 4) NOT NULL,
  min_margin_pct    NUMERIC(5, 4) NOT NULL,
  version           BIGINT        NOT NULL DEFAULT 0,
  CONSTRAINT uk_price_rule_product UNIQUE (product_id),
  CONSTRAINT fk_price_rule_product FOREIGN KEY (product_id) REFERENCES oil_product (id)
);
CREATE SEQUENCE IF NOT EXISTS price_rule_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE byproduct_sale (
  id                BIGINT         NOT NULL PRIMARY KEY,
  product_id        BIGINT         NOT NULL,
  batch_id          BIGINT,
  qty_kg            NUMERIC(10, 2) NOT NULL,
  price_per_kg_paise BIGINT        NOT NULL,
  buyer             VARCHAR(128),
  sold_at           TIMESTAMP      NOT NULL,
  created_at        TIMESTAMP      NOT NULL,
  CONSTRAINT fk_byproduct_sale_product FOREIGN KEY (product_id) REFERENCES oil_product (id),
  CONSTRAINT fk_byproduct_sale_batch FOREIGN KEY (batch_id) REFERENCES production_batch (id)
);
CREATE SEQUENCE IF NOT EXISTS byproduct_sale_SEQ START WITH 1000 INCREMENT BY 50;

ALTER TABLE production_batch ADD COLUMN IF NOT EXISTS cake_qty_kg NUMERIC(10, 2);
