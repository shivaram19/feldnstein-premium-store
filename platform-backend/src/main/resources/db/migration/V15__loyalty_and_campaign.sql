-- Loyalty + bulk campaigns (ADR-0018): loyalty accounts with an append-only
-- transaction ledger (orders and loyalty are decoupled — order_id has no FK,
-- the (order_id, type) unique pair is the idempotency backstop for EARN),
-- campaign records for the newsletter gateway providers, and the points
-- column orders carry for checkout redemptions. ANSI SQL only, valid on
-- PostgreSQL and the H2 dev/test profile.

CREATE TABLE loyalty_account (
  id                BIGINT NOT NULL PRIMARY KEY,
  email             VARCHAR(128) NOT NULL,
  points_balance    INT    NOT NULL DEFAULT 0,
  lifetime_earned   INT    NOT NULL DEFAULT 0,
  lifetime_redeemed INT    NOT NULL DEFAULT 0,
  version           BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT uk_loyalty_account_email UNIQUE (email)
);
CREATE SEQUENCE IF NOT EXISTS loyalty_account_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE loyalty_transaction (
  id            BIGINT       NOT NULL PRIMARY KEY,
  account_id    BIGINT       NOT NULL,
  order_id      BIGINT,
  type          VARCHAR(16)  NOT NULL,
  points        INT          NOT NULL,
  balance_after INT          NOT NULL,
  reason        VARCHAR(255),
  created_at    TIMESTAMP    NOT NULL,
  CONSTRAINT fk_loyalty_tx_account FOREIGN KEY (account_id) REFERENCES loyalty_account (id),
  CONSTRAINT uk_loyalty_tx_order_type UNIQUE (order_id, type)
);
CREATE SEQUENCE IF NOT EXISTS loyalty_transaction_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE campaign (
  id              BIGINT      NOT NULL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  body            VARCHAR(4000) NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'SENT',
  recipient_count INT         NOT NULL DEFAULT 0,
  provider        VARCHAR(32) NOT NULL,
  created_at      TIMESTAMP   NOT NULL,
  sent_at         TIMESTAMP
);
CREATE SEQUENCE IF NOT EXISTS campaign_SEQ START WITH 1000 INCREMENT BY 50;

ALTER TABLE customer_order ADD COLUMN IF NOT EXISTS points_redeemed INT;
