-- Single-platform CRM with WhatsApp/Instagram channels (ADR-0019): contact
-- directory (opt-in carrying, per Meta Business Messaging Policy), interaction
-- log (who said what, when, on which channel), follow-up tasks. Sequence
-- pre-created at 1000 (ADR-0006 canonical-schema discipline) so runtime inserts
-- never collide with seeded low ids; ANSI SQL only, valid on PostgreSQL and
-- the H2 dev/test profile.

CREATE TABLE crm_contact (
  id                     BIGINT       NOT NULL PRIMARY KEY,
  email                  VARCHAR(255) NOT NULL,
  name                   VARCHAR(255),
  phone                  VARCHAR(32),
  whatsapp_phone         VARCHAR(32),
  whatsapp_opt_in        BOOLEAN      NOT NULL DEFAULT FALSE,
  whatsapp_opt_in_source VARCHAR(64),
  instagram_handle       VARCHAR(64),
  source                 VARCHAR(64),
  status                 VARCHAR(16)  NOT NULL DEFAULT 'LEAD',
  tags                   VARCHAR(255),
  version                BIGINT       NOT NULL DEFAULT 0,
  created_at             TIMESTAMP    NOT NULL,
  updated_at             TIMESTAMP    NOT NULL,
  CONSTRAINT uk_crm_contact_email UNIQUE (email)
);
CREATE SEQUENCE IF NOT EXISTS crm_contact_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE crm_interaction (
  id         BIGINT       NOT NULL PRIMARY KEY,
  contact_id BIGINT       NOT NULL,
  channel    VARCHAR(16)  NOT NULL,
  direction  VARCHAR(16)  NOT NULL,
  body       TEXT         NOT NULL,
  author     VARCHAR(128) NOT NULL,
  created_at TIMESTAMP    NOT NULL,
  CONSTRAINT fk_crm_interaction_contact FOREIGN KEY (contact_id) REFERENCES crm_contact (id)
);
CREATE SEQUENCE IF NOT EXISTS crm_interaction_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE crm_task (
  id           BIGINT       NOT NULL PRIMARY KEY,
  contact_id   BIGINT       NOT NULL,
  subject      VARCHAR(255) NOT NULL,
  due_at       TIMESTAMP,
  done         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by   VARCHAR(128),
  completed_at TIMESTAMP,
  created_at   TIMESTAMP    NOT NULL,
  CONSTRAINT fk_crm_task_contact FOREIGN KEY (contact_id) REFERENCES crm_contact (id)
);
CREATE SEQUENCE IF NOT EXISTS crm_task_SEQ START WITH 1000 INCREMENT BY 50;
