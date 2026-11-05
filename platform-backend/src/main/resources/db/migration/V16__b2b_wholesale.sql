-- B2B wholesale (ADR-0018): seller directory and wholesale orders with
-- server-computed GST totals in paise. Dispatch deducts FEFO stock at the
-- source warehouse and writes WHOLESALE_OUT ledger entries. ANSI SQL only,
-- valid on PostgreSQL and the H2 dev/test profile.

CREATE TABLE b2b_seller (
  id           BIGINT       NOT NULL PRIMARY KEY,
  code         VARCHAR(32)  NOT NULL,
  name         VARCHAR(128) NOT NULL,
  contact_name VARCHAR(128),
  phone        VARCHAR(32),
  email        VARCHAR(128),
  gst          VARCHAR(32),
  address      VARCHAR(255),
  active       BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT uk_b2b_seller_code UNIQUE (code)
);
CREATE SEQUENCE IF NOT EXISTS b2b_seller_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE b2b_order (
  id                BIGINT       NOT NULL PRIMARY KEY,
  order_no          VARCHAR(32)  NOT NULL,
  seller_id         BIGINT       NOT NULL,
  status            VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
  order_date        TIMESTAMP    NOT NULL,
  dispatch_date     TIMESTAMP,
  delivered_date    TIMESTAMP,
  warehouse_id      BIGINT,
  notes             VARCHAR(500),
  sub_total_paise   BIGINT       NOT NULL DEFAULT 0,
  gst_total_paise   BIGINT       NOT NULL DEFAULT 0,
  grand_total_paise BIGINT       NOT NULL DEFAULT 0,
  version           BIGINT       NOT NULL DEFAULT 0,
  CONSTRAINT uk_b2b_order_no UNIQUE (order_no),
  CONSTRAINT fk_b2b_order_seller FOREIGN KEY (seller_id) REFERENCES b2b_seller (id)
);
CREATE SEQUENCE IF NOT EXISTS b2b_order_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE b2b_order_line (
  id               BIGINT        NOT NULL PRIMARY KEY,
  order_id         BIGINT        NOT NULL,
  variant_id       BIGINT        NOT NULL,
  qty              INT           NOT NULL,
  unit_price_paise BIGINT        NOT NULL,
  gst_pct          NUMERIC(5, 2) NOT NULL,
  line_total_paise BIGINT        NOT NULL,
  CONSTRAINT fk_b2b_line_order FOREIGN KEY (order_id) REFERENCES b2b_order (id),
  CONSTRAINT fk_b2b_line_variant FOREIGN KEY (variant_id) REFERENCES product_variant (id)
);
CREATE SEQUENCE IF NOT EXISTS b2b_order_line_SEQ START WITH 1000 INCREMENT BY 50;
