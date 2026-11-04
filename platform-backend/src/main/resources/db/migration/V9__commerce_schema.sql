-- E-commerce capabilities (spec 2026-11-04): anonymous carts, customer orders
-- with lines, payments. Orders sell gaanugu variants priced by price_config,
-- fulfilled from stock_levels with ORDER_OUT ledger entries on ship.

CREATE TABLE cart (
  id         BIGINT NOT NULL PRIMARY KEY,
  token      VARCHAR(64) NOT NULL,
  created_at TIMESTAMP   NOT NULL,
  expires_at TIMESTAMP   NOT NULL,
  CONSTRAINT uk_cart_token UNIQUE (token)
);
CREATE SEQUENCE IF NOT EXISTS cart_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE cart_item (
  id         BIGINT NOT NULL PRIMARY KEY,
  cart_id    BIGINT NOT NULL,
  variant_id BIGINT NOT NULL,
  qty        INT            NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  gst_pct    NUMERIC(5, 2)  NOT NULL,
  CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES cart (id),
  CONSTRAINT uk_cart_item_variant UNIQUE (cart_id, variant_id)
);
CREATE SEQUENCE IF NOT EXISTS cart_item_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE customer_order (
  id            BIGINT NOT NULL PRIMARY KEY,
  order_code    VARCHAR(24)    NOT NULL,
  customer_name VARCHAR(128)   NOT NULL,
  email         VARCHAR(128)   NOT NULL,
  phone         VARCHAR(32)    NOT NULL,
  address       VARCHAR(255)   NOT NULL,
  city          VARCHAR(64)    NOT NULL,
  state         VARCHAR(64)    NOT NULL,
  pincode       VARCHAR(12)    NOT NULL,
  status        VARCHAR(16)    NOT NULL DEFAULT 'PENDING',
  sub_total     NUMERIC(12, 2) NOT NULL,
  gst_total     NUMERIC(12, 2) NOT NULL,
  grand_total   NUMERIC(12, 2) NOT NULL,
  created_at    TIMESTAMP NOT NULL,
  paid_at       TIMESTAMP,
  confirmed_at  TIMESTAMP,
  shipped_at    TIMESTAMP,
  delivered_at  TIMESTAMP,
  cancelled_at  TIMESTAMP,
  cancel_reason VARCHAR(500),
  CONSTRAINT uk_customer_order_code UNIQUE (order_code)
);
CREATE SEQUENCE IF NOT EXISTS customer_order_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE order_line (
  id         BIGINT NOT NULL PRIMARY KEY,
  order_id   BIGINT NOT NULL,
  variant_id BIGINT NOT NULL,
  qty        INT            NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  gst_pct    NUMERIC(5, 2)  NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL,
  CONSTRAINT fk_order_line_order FOREIGN KEY (order_id) REFERENCES customer_order (id)
);
CREATE SEQUENCE IF NOT EXISTS order_line_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE payment (
  id           BIGINT NOT NULL PRIMARY KEY,
  order_id     BIGINT NOT NULL,
  provider     VARCHAR(16)    NOT NULL,
  provider_ref VARCHAR(128),
  amount       NUMERIC(12, 2) NOT NULL,
  status       VARCHAR(16)    NOT NULL DEFAULT 'INITIATED',
  raw_json     VARCHAR(4000),
  initiated_at TIMESTAMP NOT NULL,
  paid_at      TIMESTAMP,
  refunded_at  TIMESTAMP,
  CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES customer_order (id)
);
CREATE SEQUENCE IF NOT EXISTS payment_SEQ START WITH 1000 INCREMENT BY 50;
