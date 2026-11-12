-- Passwordless customer identity (ADR-0023): email-based accounts claimed via
-- single-use magic links; sessions are opaque bearer tokens stored hashed.
-- Orders stay linked to the email string (queried, not FK'd) so existing rows
-- need no migration.

CREATE TABLE customer_identity (
  id         BIGINT       NOT NULL PRIMARY KEY,
  email      VARCHAR(128) NOT NULL,
  name       VARCHAR(128),
  created_at TIMESTAMP    NOT NULL,
  CONSTRAINT uk_customer_identity_email UNIQUE (email)
);
CREATE SEQUENCE IF NOT EXISTS customer_identity_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE login_link (
  id          BIGINT       NOT NULL PRIMARY KEY,
  token_hash  VARCHAR(64)  NOT NULL,
  email       VARCHAR(128) NOT NULL,
  created_at  TIMESTAMP    NOT NULL,
  expires_at  TIMESTAMP    NOT NULL,
  consumed_at TIMESTAMP,
  CONSTRAINT uk_login_link_token UNIQUE (token_hash)
);
CREATE SEQUENCE IF NOT EXISTS login_link_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE customer_session (
  id         BIGINT       NOT NULL PRIMARY KEY,
  token_hash VARCHAR(64)  NOT NULL,
  email      VARCHAR(128) NOT NULL,
  created_at TIMESTAMP    NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  CONSTRAINT uk_customer_session_token UNIQUE (token_hash)
);
CREATE SEQUENCE IF NOT EXISTS customer_session_SEQ START WITH 1000 INCREMENT BY 50;

CREATE INDEX idx_login_link_email ON login_link (email);
CREATE INDEX idx_customer_session_email ON customer_session (email);
CREATE INDEX idx_customer_order_email ON customer_order (email);
