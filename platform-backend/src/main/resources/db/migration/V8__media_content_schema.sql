-- Media & content management (spec 2026-10-30): assets, generated variants,
-- site content blocks, per-product marketing overrides.

CREATE TABLE media_asset (
  id                BIGINT NOT NULL PRIMARY KEY,
  asset_key         VARCHAR(128) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  content_type      VARCHAR(64)  NOT NULL,
  size_bytes        BIGINT       NOT NULL,
  alt_text          VARCHAR(255),
  status            VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
  finalized         BOOLEAN      NOT NULL DEFAULT FALSE,
  error_note        VARCHAR(500),
  storage_key       VARCHAR(255) NOT NULL,
  created_by        VARCHAR(64),
  created_at        TIMESTAMP    NOT NULL,
  updated_at        TIMESTAMP    NOT NULL,
  CONSTRAINT uk_media_asset_key UNIQUE (asset_key)
);
CREATE SEQUENCE IF NOT EXISTS media_asset_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE media_variant (
  id           BIGINT NOT NULL PRIMARY KEY,
  asset_id     BIGINT NOT NULL,
  variant_name VARCHAR(16)  NOT NULL,
  width        INT          NOT NULL,
  height       INT          NOT NULL,
  storage_key  VARCHAR(255) NOT NULL,
  CONSTRAINT fk_media_variant_asset FOREIGN KEY (asset_id) REFERENCES media_asset (id),
  CONSTRAINT uk_media_variant UNIQUE (asset_id, variant_name)
);
CREATE SEQUENCE IF NOT EXISTS media_variant_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE content_block (
  id         BIGINT NOT NULL PRIMARY KEY,
  block_key  VARCHAR(128) NOT NULL,
  payload    TEXT         NOT NULL,
  updated_by VARCHAR(64),
  updated_at TIMESTAMP    NOT NULL,
  CONSTRAINT uk_content_block_key UNIQUE (block_key)
);
CREATE SEQUENCE IF NOT EXISTS content_block_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE product_marketing (
  id            BIGINT NOT NULL PRIMARY KEY,
  product_id    BIGINT NOT NULL,
  badge         VARCHAR(128),
  short_desc    VARCHAR(500),
  long_desc     TEXT,
  card_asset_id BIGINT,
  CONSTRAINT fk_pm_product FOREIGN KEY (product_id) REFERENCES oil_product (id),
  CONSTRAINT fk_pm_asset FOREIGN KEY (card_asset_id) REFERENCES media_asset (id),
  CONSTRAINT uk_pm_product UNIQUE (product_id)
);
CREATE SEQUENCE IF NOT EXISTS product_marketing_SEQ START WITH 1000 INCREMENT BY 50;
