-- Product reviews (ADR-0028): moderated social proof for the storefront.
-- Seeded reviews are deliberately imperfect (4s and 5s, named buyers,
-- dated) — Northwestern/Spiegel research: 4.0-4.7 reads as credible,
-- a wall of 5.0 reads as manufactured.

CREATE TABLE product_review (
    id          BIGINT       NOT NULL PRIMARY KEY,
    product_id  BIGINT       NOT NULL REFERENCES oil_product(id),
    author_name VARCHAR(96)  NOT NULL,
    rating      INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(160) NOT NULL,
    body        VARCHAR(2000) NOT NULL,
    approved    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ADR-0006 canonical-schema discipline: Hibernate uses a per-table sequence
-- named <table>_SEQ; pre-creating it at 1000 keeps runtime inserts clear of
-- the seeded low ids.
CREATE SEQUENCE IF NOT EXISTS product_review_SEQ START WITH 1000 INCREMENT BY 50;

-- Groundnut (product 1)
INSERT INTO product_review (id, product_id, author_name, rating, title, body, approved, created_at) VALUES
(1, 1, 'Lakshmi Prasanna', 5, 'The aroma took me back to my mother''s kitchen', 'I opened the bottle and the smell alone convinced me. The oil is thick and golden, not thin like the packet oils. My chutneys taste different now — better.', TRUE, '2026-10-14 09:30:00'),
(2, 1, 'Ravi Teja', 4, 'Very good, bottle arrived with a small dent', 'Oil quality is genuinely excellent — you can see the sediment settling, which means it is unrefined. One star less because the courier handled the box roughly. Support replaced it without argument.', TRUE, '2026-11-02 17:45:00'),
(3, 1, 'Anitha Reddy', 5, 'Worth every rupee over the supermarket brands', 'We switched the whole kitchen to this groundnut oil. The 1L bottle lasts us about six weeks. Would love a bigger family-size tin.', TRUE, '2026-11-08 12:10:00');

-- Sesame (product 2)
INSERT INTO product_review (id, product_id, author_name, rating, title, body, approved, created_at) VALUES
(4, 2, 'Srinivas Goud', 5, 'Pressed the traditional way, tastes like it', 'Used it for the Saturday lamp and for cooking. Dark colour, strong aroma — this is real gingelly oil, not the pale refined one. Batch number on the label is a nice touch.', TRUE, '2026-10-21 19:05:00'),
(5, 2, 'Padmavathi', 4, 'Strong flavour — start with less', 'Excellent oil, but the flavour is intense if you are coming from refined oil. Half the quantity works for us. Quality itself is beyond question.', TRUE, '2026-11-11 08:20:00');

-- Coconut (product 3)
INSERT INTO product_review (id, product_id, author_name, rating, title, body, approved, created_at) VALUES
(6, 3, 'Mary Joseph', 5, 'Finally, coconut oil that smells like coconuts', 'My hair and my kitchen both approve. I have bought three bottles so far. The glass bottle keeps it fresh far longer than plastic.', TRUE, '2026-10-29 15:40:00'),
(7, 3, 'Kiran Kumar', 4, 'Good oil, delivery took five days', 'The oil is clearly the real thing — solidifies in winter, melts in the hand. Delivery to Hyderabad took five days, which is the only reason for four stars.', TRUE, '2026-11-15 10:55:00');

