// PDP content per oil — USP chips, FAQs, and the cross-oil comparison matrix.
// Split from data/products.js so marketing copy churn doesn't touch product
// structure. Honesty rules (ADR-0025): every claim verifiable, FAQs answer the
// questions the WhatsApp concierge actually gets, no invented offers or reviews.

const COMMON_FAQS = [
  {
    q: 'How is this oil actually extracted?',
    a: 'Bullocks rotate a monolithic granite gaanuga at about 3 RPM — the slowest practical speed. Seed temperature stays below 38°C, so the oil keeps its natural antioxidants and aroma. No solvents, no hexane, no heat blasting, ever.',
  },
  {
    q: 'How is cold-pressed different from refined oil?',
    a: 'Refined oils are extracted with solvents (usually hexane) and then bleached and deodorised at temperatures above 200°C — that strips flavour, colour and most nutrients. Our oil is pressed once, settled by gravity for 48 hours, and bottled. Nothing is added, nothing is taken away.',
  },
  {
    q: 'How do I check purity at home?',
    a: 'Try the freeze test: refrigerate a small amount overnight. Pure cold-pressed oil clouds evenly and clears again at room temperature; adulterated oil often separates into layers or stays patchy.',
  },
  {
    q: 'How should I store it, and how long does it last?',
    a: 'Cool, dry, away from direct sunlight, cap tightly closed. Unrefined and preservative-free, each bottle keeps for about 12 months from pressing — the batch date is on the label, and we press to order.',
  },
  {
    q: 'Will the oil look or taste different from supermarket oil?',
    a: 'Yes — and that is the point. Unrefined oil carries the seed\'s natural colour and aroma, and you may see harmless micro-sediments from gravity settling (they prove it was never filtered with chemicals). Each batch also varies slightly with the harvest, like real food should.',
  },
]

export const productContent = {
  groundnut: {
    usps: [
      'Saurashtra heirloom peanuts',
      'Bull-driven stone gaanuga · 3 RPM',
      'Pressed below 38°C',
      'Unrefined — never bleached or deodorised',
      'Lab-tested every batch',
    ],
    faqs: [
      COMMON_FAQS[0],
      COMMON_FAQS[1],
      {
        q: 'What is the smoke point? Can I deep-fry with it?',
        a: 'Cold-pressed groundnut oil handles everyday Indian cooking comfortably — tempering, sautéing and shallow frying. For prolonged deep-frying keep the flame moderate; the nutty flavour it adds is the reason most households keep a bottle for frying.',
      },
      {
        q: 'I have a peanut allergy. Is this safe?',
        a: 'No. This is 100% peanut oil pressed in a mill that processes only oil seeds but not nuts other than groundnuts. Anyone with a peanut allergy should avoid it completely.',
      },
      COMMON_FAQS[2],
      COMMON_FAQS[3],
    ],
  },
  coconut: {
    usps: [
      'Sun-dried Tamil Nadu copra',
      'Bull-driven stone gaanuga · 3 RPM',
      'Pressed below 38°C',
      'Zero micro-filters or deodorising',
      'Lab-tested every batch',
    ],
    faqs: [
      COMMON_FAQS[0],
      COMMON_FAQS[1],
      {
        q: 'My oil turned solid and white. Is it spoiled?',
        a: 'Not at all — that is authenticity proof. Pure coconut oil solidifies below about 24°C and clears again when warm, with no loss of quality. Refined "coconut" oils that stay liquid year-round have been heavily processed.',
      },
      {
        q: 'Is this oil only for cooking?',
        a: 'It is a cooking oil first, but many customers also use it for hair oiling and skin moisturising — it is pure, food-grade and chemical-free, so it is safe for both.',
      },
      COMMON_FAQS[2],
      COMMON_FAQS[3],
    ],
  },
  sesame: {
    usps: [
      'East Godavari black sesame',
      'Bull-driven stone gaanuga · 3 RPM',
      'Pressed below 38°C',
      'Wood-pressed til oil tradition',
      'Lab-tested every batch',
    ],
    faqs: [
      COMMON_FAQS[0],
      COMMON_FAQS[1],
      {
        q: 'Can I use it for oil pulling?',
        a: 'Yes — food-grade black sesame oil is the traditional choice for oil pulling. Take a tablespoon in the morning, swish for 10–15 minutes, and spit. Its natural antimicrobial compounds are why Ayurveda has used it for centuries.',
      },
      {
        q: 'The aroma is strong. Will my food taste bitter?',
        a: 'Black sesame oil is more assertive than white sesame — a little goes a long way. Use it for tadka, chutneys and pickles where its nutty pungency is the flavour, or blend a spoon into milder oils for everyday cooking.',
      },
      COMMON_FAQS[2],
      COMMON_FAQS[3],
    ],
  },
  sunflower: {
    usps: [
      'Karnataka high-linoleic seeds',
      'Bull-driven stone gaanuga · 3 RPM',
      'Pressed below 38°C',
      'Naturally rich in Vitamin E',
      'Lab-tested every batch',
    ],
    faqs: [
      COMMON_FAQS[0],
      COMMON_FAQS[1],
      {
        q: 'What does it taste like? Will it change my dish?',
        a: 'Mild and neutral with a subtle nuttiness — it is our most versatile everyday oil. It fries crisply, bakes moist, and never overpowers the dish\'s own flavour, which is why it suits families switching from refined oil.',
      },
      {
        q: 'Is it safe to use on skin?',
        a: 'Yes — sunflower oil is one of the richest natural sources of Vitamin E, and ours is food-grade with no additives. As with any new skincare, do a small patch test first if your skin is sensitive.',
      },
      COMMON_FAQS[2],
      COMMON_FAQS[3],
    ],
  },
}

// Cross-oil comparison — the "which reserve oil is yours?" matrix.
// Derived from our own product data + the qualities each oil is known for.
export const oilComparison = [
  {
    id: 'groundnut',
    name: 'Groundnut',
    uses: ['Deep Frying', 'Sautéing', 'Cooking', 'Pickling'],
    weather: 'Any weather',
    goodFor: 'Heart health & everyday cooking',
    nutrients: 'High MUFA · Vitamin E · Phytosterols',
    aroma: 'Deep roasted nutty',
    flavour: 'Sweet & nutty',
  },
  {
    id: 'coconut',
    name: 'Coconut (Copra)',
    uses: ['Cooking', 'Hair Care', 'Skin Care', 'Oil Pulling'],
    weather: 'Warm weather',
    goodFor: 'Metabolism & skin-hair nourishment',
    nutrients: 'MCTs · Lauric acid',
    aroma: 'Sweet cocojam',
    flavour: 'Mildly sweet coconut',
  },
  {
    id: 'sesame',
    name: 'Black Sesame',
    uses: ['Tadka', 'Chutneys', 'Oil Pulling', 'Massage'],
    weather: 'Dry & cool weather',
    goodFor: 'Bone health & immunity',
    nutrients: 'Zinc · Calcium · Sesamin',
    aroma: 'Strong nutty pungent',
    flavour: 'Assertively nutty',
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    uses: ['Frying', 'Baking', 'Sautéing', 'Dressings'],
    weather: 'Any weather',
    goodFor: 'Cell protection & digestion',
    nutrients: 'Vitamin E · Omega-6',
    aroma: 'Mild nutty',
    flavour: 'Neutral & light',
  },
]
