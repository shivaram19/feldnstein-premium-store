-- AI-native marketing layer (ADR-0016): newsletter subscriber capture.
-- Sequence pre-created at 1000 (ADR-0006 canonical-schema discipline) so
-- runtime inserts never collide with seeded low ids; ANSI SQL only, valid on
-- PostgreSQL and the H2 dev/test profile.

CREATE TABLE subscriber (
  id         BIGINT NOT NULL PRIMARY KEY,
  email      VARCHAR(255)   NOT NULL,
  name       VARCHAR(255),
  source     VARCHAR(32)    NOT NULL DEFAULT 'storefront',
  created_at TIMESTAMP      NOT NULL,
  CONSTRAINT uk_subscriber_email UNIQUE (email)
);
CREATE SEQUENCE IF NOT EXISTS subscriber_SEQ START WITH 1000 INCREMENT BY 50;
