# FELDnSTEIN Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the FELDnSTEIN store homepage as a split project (index.html / css/styles.css / js/main.js) applying the three premium-psychology principles: engineered hero first impression, low cognitive load, micro-interaction delight.

**Architecture:** Static site, no build step. Tailwind via CDN with an inline brand config; custom editorial styles and animations in one stylesheet; all behavior in one vanilla JS file. Original `code.html` remains untouched as the content source and snapshot.

**Tech Stack:** HTML5, Tailwind CSS (CDN), vanilla JS (ES6), Google Fonts (Newsreader, Plus Jakarta Sans, Material Symbols Outlined).

**Spec:** `docs/superpowers/specs/2026-10-11-feldnstein-premium-redesign-design.md` (read it first).

**Content source of truth:** `feldnstein_premium_store/code.html` — ALL copy, product data (names, prices, MRP, badges, image URLs), comparison rows, testimonials, and footer links are ported from this file. Do not invent new content; tighten headlines only where the spec explicitly says so.

**Working directory:** `/home/rajneesh/Downloads/feldnstein`. All paths below are relative to it.

**Verification tools:** `node --check` (JS syntax), `python3 -m http.server` + `curl` (load check), `grep` (structural checks). No test framework exists and none should be added.

---

### Task 0: Initialize git repo

**Files:**
- Create: `.gitignore` (in project root)

- [ ] **Step 1: Init repo and first commit**

```bash
cd /home/rajneesh/Downloads/feldnstein
git init
printf 'node_modules/\n.DS_Store\n' > .gitignore
git add -A
git commit -m "chore: snapshot original stitch export"
```

Expected: `git log --oneline` shows one commit. (No repo existed before this plan; this enables per-task checkpoint commits.)

---

### Task 1: Project scaffold

**Files:**
- Create: `feldnstein_premium_store/index.html`
- Create: `feldnstein_premium_store/css/styles.css`
- Create: `feldnstein_premium_store/js/main.js`

- [ ] **Step 1: Write index.html skeleton**

Full file for now (sections get replaced in later tasks; the structure and `<head>` stay final):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FELDnSTEIN — Purity, Verified at the Source</title>
  <meta name="description" content="Bull-pressed artisanal oils and farm-direct staples. No heat. No chemicals. Lab-tested batches.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              forest: '#184e32', forestDark: '#0d3822', ochre: '#c59b27', ochreDeep: '#b8860b',
              ivory: '#fcfbf7', warmCard: '#f7f5ee', border: '#e9e5d9',
              herb: '#246942', rust: '#bc4747', charcoal: '#222522', subtle: '#414942'
            }
          },
          fontFamily: {
            serif: ['Newsreader', 'Georgia', 'serif'],
            sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body class="bg-brand-ivory text-brand-charcoal font-sans antialiased">
  <header id="siteHeader"><!-- Task 3 --></header>
  <main>
    <section id="hero"><!-- Task 4 --></section>
    <div id="ticker"><!-- Task 5 --></div>
    <section id="collection"><!-- Task 6 --></section>
    <section id="process"><!-- Task 7 --></section>
    <section id="matrix"><!-- Task 8 --></section>
    <section id="subscription"><!-- Task 9 --></section>
    <section id="testimonials"><!-- Task 9 --></section>
  </main>
  <footer id="siteFooter"><!-- Task 10 --></footer>
  <div id="toast" role="status" aria-live="polite"></div>
  <div id="quickViewModal"><!-- Task 6 --></div>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write minimal css/styles.css**

```css
:root {
  --forest: #184e32; --forest-dark: #0d3822; --ochre: #c59b27; --ochre-deep: #b8860b;
  --ivory: #fcfbf7; --warm-card: #f7f5ee; --hairline: #e9e5d9;
  --herb: #246942; --rust: #bc4747; --charcoal: #222522;
  --shadow-ambient: 0 8px 24px -4px rgba(24, 78, 50, 0.06);
}
```

- [ ] **Step 3: Write minimal js/main.js**

```js
// FELDnSTEIN premium store — behavior module
'use strict';
console.log('feldnstein: main.js loaded');
```

- [ ] **Step 4: Verify**

Run:
```bash
cd feldnstein_premium_store
node --check js/main.js && echo "JS OK"
python3 -m http.server 8137 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8137/index.html
kill %1
```
Expected: `JS OK`, then `200`.

- [ ] **Step 5: Commit**

```bash
cd /home/rajneesh/Downloads/feldnstein
git add feldnstein_premium_store/index.html feldnstein_premium_store/css/styles.css feldnstein_premium_store/js/main.js
git commit -m "feat: project scaffold with tailwind brand config"
```

---

### Task 2: Design tokens, canonical buttons, base motion styles

**Files:**
- Modify: `feldnstein_premium_store/css/styles.css`

- [ ] **Step 1: Append component and motion styles**

```css
/* ===== Canonical buttons (exactly three styles site-wide) ===== */
.btn { display: inline-flex; align-items: center; gap: 0.625rem; border-radius: 9999px;
  font-weight: 600; font-size: 0.875rem; padding: 0.875rem 1.75rem;
  transition: background-color .25s ease, color .25s ease, transform .15s ease, box-shadow .25s ease, border-color .25s ease; }
.btn:active { transform: scale(.98); }
.btn:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(24,78,50,.12); }
.btn-primary { background: var(--forest); color: #fff; }
.btn-primary:hover { background: var(--forest-dark); box-shadow: var(--shadow-ambient); }
.btn-gold { background: var(--ochre); color: #fff; }
.btn-gold:hover { background: var(--ochre-deep); box-shadow: var(--shadow-ambient); }
.btn-ghost { background: transparent; color: var(--forest); border: 1.5px solid var(--forest); }
.btn-ghost:hover { background: var(--forest); color: #fff; }

/* ===== Section header (numbered, editorial) ===== */
.section-head { max-width: 42rem; margin: 0 auto 3rem; text-align: center; }
.section-label { display: inline-flex; align-items: center; gap: .5rem; font-size: .6875rem;
  font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ochre); margin-bottom: .75rem; }
.section-title { font-family: 'Newsreader', Georgia, serif; font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.15; color: var(--forest); font-weight: 500; }
.section-title em { font-style: italic; color: var(--ochre); font-weight: 400; }
.section-sub { margin-top: .75rem; font-size: .9375rem; line-height: 1.6; color: var(--charcoal); opacity: .85; }
.hairline-rule { height: 1px; background: var(--hairline); width: 4rem; margin: 0 auto 1.25rem; }

/* ===== Signature arch frame ===== */
.arch-frame { border-radius: 999px 999px 24px 24px; overflow: hidden; }
@media (max-width: 767px) { .arch-frame { border-radius: 120px 120px 20px 20px; } }

/* ===== Card hover ===== */
.card-lift { transition: transform .35s ease, box-shadow .35s ease; }
.card-lift:hover { transform: translateY(-4px); box-shadow: var(--shadow-ambient); }
.card-img-zoom img { transition: transform .5s ease; }
.card-img-zoom:hover img { transform: scale(1.04); }

/* ===== Scroll reveal ===== */
[data-reveal] { opacity: 0; transform: translateY(16px); transition: opacity .6s ease-out, transform .6s ease-out; }
[data-reveal].is-revealed { opacity: 1; transform: none; }

/* ===== Toast ===== */
#toast { position: fixed; left: 50%; bottom: 2rem; transform: translate(-50%, 150%); z-index: 60;
  background: var(--forest-dark); color: #fff; font-size: .8125rem; font-weight: 600;
  padding: .75rem 1.5rem; border-radius: 9999px; box-shadow: var(--shadow-ambient);
  transition: transform .35s cubic-bezier(.22,1,.36,1); pointer-events: none; max-width: 90vw; }
#toast.show { transform: translate(-50%, 0); }

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
  [data-reveal] { opacity: 1; transform: none; }
}
```

- [ ] **Step 2: Verify**

Run: `grep -c "btn-primary" feldnstein_premium_store/css/styles.css` → Expected: `1`. Run: `node --check feldnstein_premium_store/js/main.js` → Expected: silent (exit 0).

- [ ] **Step 3: Commit**

```bash
git add feldnstein_premium_store/css/styles.css
git commit -m "feat: design tokens, canonical buttons, reveal/toast/motion styles"
```

---

### Task 3: Header, sticky shrink, mobile menu, scrollspy

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<header id="siteHeader">`)
- Modify: `feldnstein_premium_store/js/main.js`
- Modify: `feldnstein_premium_store/css/styles.css`

- [ ] **Step 1: Header markup** — replace the `<header>` placeholder:

```html
<header id="siteHeader" class="sticky top-0 z-50 border-b transition-all duration-300 bg-brand-ivory/90 backdrop-blur-md border-brand-ochre/15">
  <div class="max-w-7xl mx-auto px-6 lg:px-12">
    <div class="flex items-center justify-between h-16 lg:h-20 transition-all duration-300" id="headerInner">
      <a href="#hero" class="font-serif text-2xl lg:text-3xl font-medium text-brand-forest tracking-tight">FELDn<span class="italic text-brand-ochre">STEIN</span></a>
      <nav class="hidden lg:flex items-center gap-8 text-sm font-semibold" aria-label="Primary">
        <a href="#collection" class="nav-link text-brand-charcoal hover:text-brand-forest transition-colors">Shop</a>
        <a href="#matrix" class="nav-link text-brand-charcoal hover:text-brand-forest transition-colors">Our Standard</a>
        <a href="#process" class="nav-link text-brand-charcoal hover:text-brand-forest transition-colors">Journal</a>
        <a href="#subscription" class="nav-link text-brand-charcoal hover:text-brand-forest transition-colors">Club</a>
      </nav>
      <div class="flex items-center gap-3">
        <button id="cartBtn" class="relative w-10 h-10 rounded-full flex items-center justify-center text-brand-forest hover:bg-brand-warmCard transition-colors" aria-label="Cart">
          <span class="material-symbols-outlined">shopping_bag</span>
          <span id="cartCount" class="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-ochre text-white text-[10px] font-bold hidden items-center justify-center">0</span>
        </button>
        <button id="menuBtn" class="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-brand-forest" aria-label="Menu" aria-expanded="false">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </div>
    </div>
    <div id="mobileMenu" class="lg:hidden hidden pb-4 flex flex-col gap-3 text-sm font-semibold">
      <a href="#collection" class="nav-link text-brand-charcoal">Shop</a>
      <a href="#matrix" class="nav-link text-brand-charcoal">Our Standard</a>
      <a href="#process" class="nav-link text-brand-charcoal">Journal</a>
      <a href="#subscription" class="nav-link text-brand-charcoal">Club</a>
    </div>
  </div>
</header>
```

- [ ] **Step 2: JS — header shrink, mobile menu, scrollspy.** Append to `js/main.js`:

```js
// --- Sticky header shrink ---
const header = document.getElementById('siteHeader');
const headerInner = document.getElementById('headerInner');
const onScrollHeader = () => {
  const scrolled = window.scrollY > 40;
  headerInner.classList.toggle('h-14', scrolled);
  headerInner.classList.toggle('lg:h-16', scrolled);
  headerInner.classList.toggle('h-16', !scrolled);
  headerInner.classList.toggle('lg:h-20', !scrolled);
};
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

// --- Mobile menu ---
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', String(!open));
  menuBtn.querySelector('.material-symbols-outlined').textContent = open ? 'menu' : 'close';
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileMenu.classList.add('hidden');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
}));

// --- Scrollspy ---
const navLinks = document.querySelectorAll('.nav-link');
const spyTargets = [...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('text-brand-forest', a.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
spyTargets.forEach(t => spy.observe(t));
```

- [ ] **Step 3: Active-link CSS.** Append to styles.css:

```css
.nav-link.text-brand-forest { position: relative; }
.nav-link.text-brand-forest::after { content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 2px; border-radius: 2px; background: var(--ochre); }
```

- [ ] **Step 4: Verify**

Run: `node --check feldnstein_premium_store/js/main.js` → exit 0. Run: `grep -c "siteHeader" feldnstein_premium_store/index.html` → Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git add feldnstein_premium_store/index.html feldnstein_premium_store/js/main.js feldnstein_premium_store/css/styles.css
git commit -m "feat: masthead header with shrink, mobile menu, scrollspy"
```

---

### Task 4: Hero — the 50-millisecond halo

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<section id="hero">`)

- [ ] **Step 1: Hero markup.** Port the hero image URL from `code.html` line ~120 (`<img src="https://lh3.googleusercontent.com/aida/AEtjO1WHlLoK...` — the Vedic Gaanuga mill illustration; copy the full URL verbatim). Structure:

```html
<section id="hero" class="relative w-full min-h-[88vh] flex items-center overflow-hidden bg-brand-ivory">
  <div class="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 w-full">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
      <div class="lg:col-span-7" data-reveal>
        <div class="section-label"><span class="material-symbols-outlined text-sm">eco</span> Farm-Direct · Lab-Tested · Small Batch</div>
        <h1 class="font-serif font-medium text-brand-forest tracking-tight text-[2.5rem] leading-[1.1] sm:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
          Where tradition meets <em class="italic font-normal text-brand-ochre">purity.</em>
        </h1>
        <p class="mt-6 text-base sm:text-lg text-brand-charcoal/85 leading-relaxed max-w-md">Bull-pressed oils, crafted slowly from the finest seeds. No heat. No chemicals. Just pure oil your family can trust.</p>
        <div class="mt-8 flex flex-wrap items-center gap-4">
          <a href="#collection" class="btn btn-primary">Shop the Reserve <span class="material-symbols-outlined text-base">arrow_forward</span></a>
          <a href="#matrix" class="btn btn-ghost">Our Standard</a>
        </div>
      </div>
      <div class="lg:col-span-5" data-reveal>
        <div class="arch-frame card-img-zoom relative">
          <img src="PASTE-HERO-IMAGE-URL-FROM-CODE-HTML" alt="Traditional bull-pressed Vedic Gaanuga mill" class="w-full h-[420px] lg:h-[560px] object-cover">
        </div>
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0 flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-1.5 shadow-[0_8px_24px_-4px_rgba(24,78,50,0.06)]">
          <span class="material-symbols-outlined text-brand-ochre text-xl">verified</span>
          <span class="text-[11px] font-bold uppercase tracking-wider text-brand-forest">Lab Verified · Batch 042</span>
        </div>
      </div>
    </div>
  </div>
</section>
```

(The badge pill sits inside a `relative` wrapper — add `relative` to the right column div in the final markup.)

- [ ] **Step 2: Verify**

Run: `grep -c "arch-frame" feldnstein_premium_store/index.html` → Expected: `1`. Run: `grep -c "unsplash\|googleusercontent" feldnstein_premium_store/index.html` → Expected: ≥ 1 (image URL actually pasted, not the placeholder).

- [ ] **Step 3: Commit**

```bash
git add feldnstein_premium_store/index.html
git commit -m "feat: editorial split hero with arch frame and verified badge"
```

---

### Task 5: Trust ticker + section header helper

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<div id="ticker">`)

- [ ] **Step 1: Ticker markup.** Port the six trust statements from `code.html` lines 144–170 (100% Bull Rotated Gaanuga Mill, Zero Chemical Refining, and the remaining items in that ribbon — copy verbatim):

```html
<div class="w-full bg-brand-warmCard border-y border-brand-border py-4 overflow-hidden select-none">
  <div class="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-widest text-brand-forest font-semibold text-center">
    <!-- paste the six <span> trust statements from code.html lines 144-170 here -->
  </div>
</div>
```

- [ ] **Step 2: Verify** — `grep -c "Gaanuga" feldnstein_premium_store/index.html` → Expected: `1` (statement ported).

- [ ] **Step 3: Commit**

```bash
git add feldnstein_premium_store/index.html
git commit -m "feat: trust ticker ribbon below hero"
```

---

### Task 6: Collection — arched cards, filter pills, carousel, quick-view modal, cart

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<section id="collection">` and `<div id="quickViewModal">`)
- Modify: `feldnstein_premium_store/js/main.js`

- [ ] **Step 1: Section markup.** Section header uses the canonical pattern:

```html
<div class="section-head" data-reveal>
  <div class="hairline-rule"></div>
  <div class="section-label">01 — The Absolute Reserve</div>
  <h2 class="section-title">The <em>absolute</em> reserve collection</h2>
  <p class="section-sub">Small-batch staples, stone-pressed and lab-verified. Port the original subcopy from code.html line ~194-232.</p>
</div>
```

Then the filter pills (`All / Oils / Ghee / Staples` — categories must match the `data-category` values used below) and the product cards. **Port every product from `code.html` lines 194–352** — each card keeps its image URL, name, description, price/MRP, and `data-category` attribute, rebuilt in this uniform card shape:

```html
<article class="product-item card-lift card-img-zoom arch-frame bg-white flex flex-col" data-category="oils ghee" data-reveal>
  <div class="relative"><img src="PORTED-URL" alt="PORTED-NAME" class="w-full h-64 object-cover">
    <span class="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-brand-forest rounded-full px-3 py-1">PORTED-BADGE</span>
  </div>
  <div class="p-6 flex flex-col flex-1 text-center">
    <h3 class="font-serif text-lg font-semibold text-brand-forest">PORTED-NAME</h3>
    <p class="mt-1 text-xs text-brand-charcoal/70 leading-relaxed flex-1">PORTED-DESC</p>
    <div class="mt-4 flex items-baseline justify-center gap-2">
      <span class="font-serif text-xl font-bold text-brand-forest">₹PORTED-PRICE</span>
      <span class="text-xs text-brand-charcoal/50 line-through">₹PORTED-MRP</span>
    </div>
    <button class="btn btn-primary mt-4 w-full quick-add" data-name="PORTED-NAME" data-price="PORTED-PRICE">Add to Reserve Cart</button>
  </div>
</article>
```

Cards live in a horizontal snap-scroll carousel (the original interaction, kept per spec): `<div id="productCarousel" class="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 max-w-7xl mx-auto px-6 lg:px-12" style="scrollbar-width:none">` with each card given `min-w-[300px] sm:min-w-[340px] snap-start`. Below it, prev/next arrow buttons (material symbols `arrow_back` / `arrow_forward`, calling `scrollCarousel(-1)` / `scrollCarousel(1)`) and three progress dots (`#carouselDots` containing three `span` elements). Filtering hides non-matching cards inside the same track. Keep a `Quick View` affordance per card (small ghost icon-button calling `openQuickView(...)` with the same data as the original modal calls).

- [ ] **Step 2: Quick-view modal markup** — port the modal from `code.html` line 792 into `<div id="quickViewModal">`, keeping its inner IDs (`modalImg`, `modalTitle`, `modalBadge`, `modalPrice`, `modalMrp`, `modalAddBtn`) so the JS below works unchanged, but replace the outer wrapper classes with: `class="fixed inset-0 z-50 hidden items-center justify-center bg-brand-charcoal/60 backdrop-blur-sm p-4"` (add `items-center justify-center` and drop the always-on `flex` so the `hidden` class works).

- [ ] **Step 3: JS — filter, quick view, cart, toast.** Append to `js/main.js`:

```js
```js
// --- Carousel ---
window.scrollCarousel = dir => {
  const track = document.getElementById('productCarousel');
  track.scrollBy({ left: dir * 360, behavior: 'smooth' });
};
const carouselTrack = document.getElementById('productCarousel');
const carouselDots = document.querySelectorAll('#carouselDots span');
carouselTrack.addEventListener('scroll', () => {
  const max = carouselTrack.scrollWidth - carouselTrack.clientWidth;
  if (max <= 0) return;
  const idx = Math.min(carouselDots.length - 1, Math.floor((carouselTrack.scrollLeft / max) * carouselDots.length));
  carouselDots.forEach((d, i) => {
    d.className = i === idx
      ? 'w-6 h-1.5 rounded-full bg-brand-forest transition-all'
      : 'w-1.5 h-1.5 rounded-full bg-brand-border transition-all';
  });
}, { passive: true });

// --- Category filter ---
window.filterProducts = (btn, category) => {
  document.querySelectorAll('.category-pill').forEach(b => {
    b.classList.remove('bg-brand-forest', 'text-white');
    b.classList.add('text-brand-subtle');
  });
  btn.classList.add('bg-brand-forest', 'text-white');
  btn.classList.remove('text-brand-subtle');
  document.querySelectorAll('.product-item').forEach(item => {
    const cats = item.dataset.category || '';
    item.style.display = (category === 'all' || cats.includes(category)) ? 'flex' : 'none';
  });
};

// --- Quick view ---
const modal = document.getElementById('quickViewModal');
window.openQuickView = (name, price, mrp, img, badge) => {
  document.getElementById('modalTitle').textContent = name;
  document.getElementById('modalPrice').textContent = '₹' + price;
  document.getElementById('modalMrp').textContent = '₹' + mrp;
  document.getElementById('modalImg').src = img;
  document.getElementById('modalBadge').textContent = badge || 'Cold Pressed Batch';
  modal.dataset.name = name; modal.dataset.price = price;
  modal.classList.remove('hidden'); modal.classList.add('flex');
};
window.closeQuickView = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
modal.addEventListener('click', e => { if (e.target === modal) closeQuickView(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuickView(); });

// --- Cart + toast (peak-end moment) ---
let cartTotal = 0, cartItems = 0;
const cartCount = document.getElementById('cartCount');
const toast = document.getElementById('toast');
let toastTimer;
window.quickAddProduct = (name, price) => {
  cartItems += 1; cartTotal += Number(price);
  cartCount.textContent = String(cartItems);
  cartCount.classList.remove('hidden'); cartCount.classList.add('flex');
  toast.textContent = `Added to Reserve Cart — ${name} · ₹${cartTotal}`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
};
document.getElementById('modalAddBtn').addEventListener('click', () => {
  quickAddProduct(modal.dataset.name, modal.dataset.price);
  closeQuickView();
});
document.querySelectorAll('.quick-add').forEach(b =>
  b.addEventListener('click', () => quickAddProduct(b.dataset.name, b.dataset.price)));
```

Note: the original inline `onclick="confirmModalAdd()"` in the modal button must be removed since the listener above replaces it.

- [ ] **Step 4: Verify**

Run: `node --check feldnstein_premium_store/js/main.js` → exit 0. Run: `grep -c "product-item" feldnstein_premium_store/index.html` → Expected: same count as products in code.html (≥ 6). Run: `grep -c "onclick" feldnstein_premium_store/index.html` → Expected: only `filterProducts`/`openQuickView` inline calls on ported elements remain; zero `onclick` attributes on `modalAddBtn`.

- [ ] **Step 5: Commit**

```bash
git add feldnstein_premium_store/index.html feldnstein_premium_store/js/main.js
git commit -m "feat: reserve collection cards, filter, quick-view modal, cart toast"
```

---

### Task 7: Process — "From Native Seeds to Culinary Gold"

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<section id="process">`)

- [ ] **Step 1: Port and rebuild.** Section header pattern with label `02 — From Native Seeds to Culinary Gold`. Port all process/category cards from `code.html` lines 232–352, rebuilding each in the uniform card: `rounded-2xl bg-brand-warmCard border border-brand-border p-6 card-lift card-img-zoom` with centered image (ported URL, `h-40 object-contain`), Newsreader card title, ported description, and the ported CTA. Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`. Keep the original section CTA button but restyle it as `btn btn-ghost`.

- [ ] **Step 2: Verify** — `grep -c "rounded-2xl bg-brand-warmCard" feldnstein_premium_store/index.html` → Expected: equals number of process cards (≥ 3).

- [ ] **Step 3: Commit**

```bash
git add feldnstein_premium_store/index.html
git commit -m "feat: process section on uniform editorial grid"
```

---

### Task 8: Comparison matrix — "What Goes Into Your Cooking Matters"

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<section id="matrix">`)

- [ ] **Step 1: Port.** Section header with label `03 — Strict Transparency`. Port the full comparison table from `code.html` line 353–356 (the single-line section) **verbatim**, changing only: wrap it in `<div class="max-w-7xl mx-auto px-6 lg:px-12" data-reveal>`, and change the section opening tag to `<section id="matrix" class="py-20 lg:py-24">`. Keep the row `hover:bg-brand-warmCard/30` highlights and all red/green column treatments exactly as ported.

- [ ] **Step 2: Verify** — `grep -c "Commercial Baseline" feldnstein_premium_store/index.html` → Expected: `1`. `grep -c "Vedic Gaanuga Mill" feldnstein_premium_store/index.html` → Expected: `1`.

- [ ] **Step 3: Commit**

```bash
git add feldnstein_premium_store/index.html
git commit -m "feat: transparency comparison matrix"
```

---

### Task 9: Subscription club + testimonials

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<section id="subscription">` and `<section id="testimonials">`)

- [ ] **Step 1: Subscription.** Section header label `04 — The Reserve Club`. Port content from `code.html` lines 357–415. The subscription/purchase CTA must use `btn btn-gold` (the only gold action on the page besides final checkout-style buttons); secondary actions `btn btn-ghost`. Card wrapper: `rounded-3xl bg-white border border-brand-border p-6 lg:p-8 card-lift`.

- [ ] **Step 2: Testimonials.** Section header label `05 — What Makes People Come Back`. Port all testimonial cards from `code.html` lines 416–520 into uniform cards: `rounded-2xl bg-white border border-brand-border p-6 flex flex-col card-lift`, with 5-star row (`star` icons, `text-brand-forest`), Newsreader quote text (`font-serif italic text-brand-charcoal`), ported name/avatar, `data-reveal` on each. Grid: `grid grid-cols-1 md:grid-cols-3 gap-6`.

- [ ] **Step 3: Verify** — `grep -c "btn-gold" feldnstein_premium_store/index.html` → Expected: ≥ 1. `grep -c "star" feldnstein_premium_store/index.html` → Expected: ≥ 15 (5 per card × 3 cards).

- [ ] **Step 4: Commit**

```bash
git add feldnstein_premium_store/index.html
git commit -m "feat: reserve club and testimonials sections"
```

---

### Task 10: Footer — deep forest grounding block

**Files:**
- Modify: `feldnstein_premium_store/index.html` (fill `<footer id="siteFooter">`)

- [ ] **Step 1: Port.** Port the footer from `code.html` lines 608–690 and the app-download module from lines 521–607, wrapping in `<footer id="siteFooter" class="bg-brand-forestDark text-white">`. Rebuild link columns into exactly four groups — Shop, Company, Support, Legal — porting the actual link labels/hrefs from the original footer; group headings in `label-caps` style (`text-[11px] font-bold uppercase tracking-widest text-brand-ochre`). Newsletter input: `w-full rounded-full bg-white/10 border border-white/20 px-5 py-3 text-sm placeholder-white/50 focus:outline-none focus:border-brand-ochre`. Bottom row: ported copyright/attribution line in `text-xs text-white/60`.

- [ ] **Step 2: Verify** — `grep -c "brand-forestDark" feldnstein_premium_store/index.html` → Expected: ≥ 2.

- [ ] **Step 3: Commit**

```bash
git add feldnstein_premium_store/index.html
git commit -m "feat: deep forest footer with app module and four link columns"
```

---

### Task 11: Scroll-reveal system wiring

**Files:**
- Modify: `feldnstein_premium_store/js/main.js`
- Modify: `feldnstein_premium_store/index.html` (add `data-reveal` where missing on section headers and cards)

- [ ] **Step 1: JS.** Append to `js/main.js`:

```js
// --- Scroll reveal (peak-end micro-interaction) ---
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-revealed'); revealer.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  // stagger siblings that share a parent (grids and carousel tracks)
  document.querySelectorAll('[data-reveal]').forEach(el => revealer.observe(el));
  const groupIndex = new Map();
  document.querySelectorAll('[data-reveal]').forEach(el => {
    const p = el.parentElement;
    const i = groupIndex.get(p) || 0;
    groupIndex.set(p, i + 1);
    el.style.transitionDelay = `${Math.min(i * 80, 400)}ms`;
  });
} else {
  document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
}
```

- [ ] **Step 2: Ensure coverage.** Run: `grep -c "data-reveal" feldnstein_premium_store/index.html` → Expected: ≥ 10 (hero columns, every section head, product cards, process cards, testimonial cards).

- [ ] **Step 3: Verify + commit**

```bash
node --check feldnstein_premium_store/js/main.js
git add feldnstein_premium_store/js/main.js feldnstein_premium_store/index.html
git commit -m "feat: intersectionobserver scroll reveals with stagger and reduced-motion fallback"
```

---

### Task 12: Final end-to-end verification

**Files:**
- Modify: none (verification only; fix what it finds)

- [ ] **Step 1: Syntax + load check**

```bash
cd feldnstein_premium_store
node --check js/main.js && echo "JS OK"
python3 -m http.server 8137 & sleep 1
for f in index.html css/styles.css js/main.js; do curl -s -o /dev/null -w "%{http_code} $f\n" http://localhost:8137/$f; done
kill %1
```
Expected: `JS OK` and three `200` lines.

- [ ] **Step 2: Content completeness** — every original section exists in the new page:

```bash
cd feldnstein_premium_store
for marker in "Where tradition meets" "Absolute Reserve\|absolute" "Gaanuga" "Commercial Baseline" "Reserve Club\|subscription" "FELDn"; do
  echo -n "$marker: "; grep -ci "$marker" index.html
done
```
Expected: every marker count ≥ 1.

- [ ] **Step 3: No leftover placeholders**

```bash
grep -n "PASTE-\|PORTED-\|TODO\|TBD\|<!-- Task" feldnstein_premium_store/index.html
```
Expected: no output.

- [ ] **Step 4: Browser verification** — run `xdg-open http://localhost:8137/index.html` (server started as in Step 1) and confirm with the user: hero renders as 7/5 split at desktop width, stacks at 375px, header shrinks on scroll, reveals fire, modal opens/closes, cart toast appears. Fix any console errors found.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final verification pass for premium redesign"
```
