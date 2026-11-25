// Static policy + FAQ content for the storefront (footer Policy & Info nav).
// Plain data so PolicyView stays a dumb renderer. Vocabulary follows the
// bottle labels and site copy (Gaanuga, stone-pressed, apothecary glass).

export const POLICIES = {
  refunds: {
    title: 'Return & Refund Policy',
    updated: 'Last updated: November 2026',
    intro:
      'We stand behind every bottle that leaves the Mothadaka mill. If something is not right, we make it right — no long forms, no arguing.',
    sections: [
      {
        heading: 'Damaged or leaking bottles',
        body: 'Apothecary glass is tough, but couriers can be tougher. If any bottle arrives cracked, leaking, or with a broken seal, send us a photo within 48 hours of delivery on WhatsApp (+91 91600 98989) or by email. We replace the bottle free of charge or refund it in full — your choice.',
      },
      {
        heading: 'Unopened bottles',
        body: 'Changed your mind? Unopened, seal-intact bottles can be returned within 7 days of delivery. We arrange doorstep pickup and refund the product price to your original payment method within 5–7 working days of receiving the return.',
      },
      {
        heading: 'Opened bottles',
        body: 'For food safety reasons we cannot accept returns of opened bottles. If the oil itself seems off — smell, taste, or sediment that worries you — contact us within 7 days. Every batch is traceable to its pressing session, so we can investigate and refund where warranted.',
      },
      {
        heading: 'Late or missing deliveries',
        body: 'If tracking shows no movement for 7 days, we reship at no cost or refund in full — whichever you prefer.',
      },
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    updated: 'Last updated: November 2026',
    intro:
      'Oil is pressed to order, packed in glass-safe cartons, and dispatched from Guntur, Andhra Pradesh.',
    sections: [
      {
        heading: 'Dispatch time',
        body: 'Orders are pressed, bottled, and packed within 24–48 hours (Monday–Saturday). You receive a tracking link the moment the carton leaves our hands.',
      },
      {
        heading: 'Delivery time',
        body: 'Metro cities: 2–4 working days after dispatch. Rest of India: 4–7 working days. Remote pin codes can take a day or two longer.',
      },
      {
        heading: 'Glass-safe packaging',
        body: 'Every bottle travels in a moulded pulp nest inside a rigid carton, sealed against leaks. This is why our breakage rate stays under 1% — and why the replacement policy above exists for that 1%.',
      },
      {
        heading: 'Shipping charges',
        body: 'Shipping is calculated at checkout by weight and pin code. Subscription (Kitchen Reserve) orders ship with discounted courier rates applied automatically.',
      },
      {
        heading: 'Where we ship',
        body: 'All serviceable pincodes across India through our courier partners. We do not currently ship internationally.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: November 2026',
    intro:
      'We collect the minimum needed to press, pack, and deliver your oil — and nothing more.',
    sections: [
      {
        heading: 'What we collect',
        body: 'Your name, phone, email, delivery address, and order history. If you sign in, we store a secure session token; our passwordless sign-in links are the only key — we never see or store a password.',
      },
      {
        heading: 'How we use it',
        body: 'To fulfil orders, send delivery updates, answer support queries, and — only if you opt in — occasional batch-press announcements. We do not sell, rent, or trade your personal information to anyone.',
      },
      {
        heading: 'Payments',
        body: 'Payment details are processed by our payment gateway and never touch our servers. We store only the transaction reference needed for refunds.',
      },
      {
        heading: 'Your choices',
        body: 'Email us at contact@feldnstein.com any time to view, correct, or delete your data. Marketing emails carry a one-click unsubscribe; order-related messages (dispatch, delivery) cannot be unsubscribed while an order is active.',
      },
      {
        heading: 'Data retention',
        body: 'Order records are retained as required for tax and food-safety traceability (FSSAI). Everything else is deleted when you ask.',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    updated: 'Last updated: November 2026',
    intro:
      'The plain-language agreement between you and FELD·N·STEIN Pure Botanical Oils Ltd. for using this store.',
    sections: [
      {
        heading: 'Orders and pricing',
        body: 'All prices are in Indian Rupees and include GST unless stated otherwise. An order is accepted once it is pressed and dispatched — until then we may decline or refund an order (for example, an unserviceable pin code).',
      },
      {
        heading: 'Product nature',
        body: 'Cold-pressed, unrefined oil is a natural product. Colour, aroma, and sediment vary slightly batch to batch with the harvest — that variance is the point, not a defect. Best-before dates are printed on every bottle label.',
      },
      {
        heading: 'Use of the site',
        body: 'Content on this site — copy, photography, illustrations, the bull emblem — belongs to FELD·N·STEIN and may not be reused without written permission.',
      },
      {
        heading: 'Liability',
        body: 'Our liability for any claim is limited to the value of the order in question. Nothing in these terms limits liability that cannot be limited by law.',
      },
      {
        heading: 'Governing law',
        body: 'These terms are governed by the laws of India, with courts at Guntur, Andhra Pradesh having jurisdiction.',
      },
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    updated: '',
    intro:
      'The questions we hear most often at the mill gate and on WhatsApp, answered straight.',
    faqs: [
      {
        q: 'What does “bull-driven Gaanuga” actually mean?',
        a: 'A Gaanuga is the traditional granite churner. Our press is rotated by bullocks walking a set path, grinding seeds between granite stones at low speed. The oil never exceeds ~40°C — no external heat, no solvents. That is what “cold-pressed” is supposed to mean.',
      },
      {
        q: 'Why is there sediment at the bottom of my bottle?',
        a: 'Because the oil is unrefined. We let each batch sediment naturally and rack it off, but fine particles remain — a sign the oil was never filtered with chemicals. Shake gently or pour carefully; it is completely safe.',
      },
      {
        q: 'How should I store the oil?',
        a: 'Cool, dry, away from direct sunlight — a kitchen cabinet, not the windowsill or the fridge. Use within 12 months of packaging; the best-before date is on every label. Always reseal the cap tightly.',
      },
      {
        q: 'Is the oil safe for high-heat cooking?',
        a: 'Groundnut and sunflower handle everyday sautéing and deep-frying well. Sesame and coconut prefer medium heat. For any oil, once it smokes it has given up its flavour and nutrition — and that is true of every oil on earth.',
      },
      {
        q: 'How does the Kitchen Reserve subscription work?',
        a: 'Switch on “Subscribe & Save” on any product and you get 10% off every order. Recurring delivery scheduling is rolling out shortly; for now your subscription price applies to each order you place. No lock-in — switch it off any time from the cart.',
      },
      {
        q: 'A bottle arrived broken. What now?',
        a: 'Photo within 48 hours on WhatsApp (+91 91600 98989) and a replacement is on its way free — see the Return & Refund Policy above for details.',
      },
      {
        q: 'Do you sell in bulk or to retailers?',
        a: 'Yes — 5-litre kitchen cans are listed in the collection, and larger volumes for restaurants and stores are handled directly. WhatsApp us with your requirement and city.',
      },
    ],
  },
}

export const POLICY_NAV = [
  { key: 'refunds', label: 'Return & Refund Policy' },
  { key: 'shipping', label: 'Shipping Policy' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms & Conditions' },
  { key: 'faq', label: "FAQ's" },
]
