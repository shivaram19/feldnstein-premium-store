'use strict';

// --- Sticky header shrink ---
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
const closeMenu = () => {
  mobileMenu.classList.add('hidden');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Menu');
  menuBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
};
menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', String(!open));
  menuBtn.setAttribute('aria-label', open ? 'Menu' : 'Close menu');
  menuBtn.querySelector('.material-symbols-outlined').textContent = open ? 'menu' : 'close';
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
    closeMenu();
    menuBtn.focus();
  }
});
document.addEventListener('click', e => {
  if (mobileMenu.classList.contains('hidden')) return;
  if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});

// --- Scrollspy ---
// dedupe: desktop + mobile navs share hrefs.
// Scroll-position based: unlike an IntersectionObserver, this can represent
// "no section yet" — at the hero (above the first nav target) nothing is highlighted.
const navLinks = document.querySelectorAll('.nav-link');
const spyTargets = [...new Set([...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean))]
  .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
let spyTicking = false;
function updateSpy() {
  spyTicking = false;
  const probe = window.scrollY + window.innerHeight * 0.38;
  let currentId = null;
  for (const t of spyTargets) {
    if (t.getBoundingClientRect().top + window.scrollY <= probe) currentId = t.id;
  }
  navLinks.forEach(a => {
    const active = '#' + currentId === a.getAttribute('href');
    a.classList.toggle('text-brand-forest', active);
    if (active) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
}
function onSpyScroll() {
  if (!spyTicking) { spyTicking = true; requestAnimationFrame(updateSpy); }
}
window.addEventListener('scroll', onSpyScroll, { passive: true });
window.addEventListener('resize', onSpyScroll);
updateSpy();

// --- Scroll reveal (peak-end micro-interaction) ---
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-revealed'); revealer.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
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

// --- Ambient videos: respect reduced motion (poster/static frame stays) ---
if (prefersReduced) {
  document.querySelectorAll('video.ambient-video').forEach(v => {
    v.removeAttribute('autoplay');
    v.pause();
  });
}

// --- Lazy-activate below-fold ambient videos (keeps initial load light) ---
if (!prefersReduced && 'IntersectionObserver' in window) {
  const videoLoader = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const v = e.target;
      const srcEl = v.querySelector('source[data-src]');
      if (srcEl) {
        srcEl.src = srcEl.dataset.src;
        v.load();
        v.play().catch(() => {});
      }
      videoLoader.unobserve(v);
    });
  }, { rootMargin: '300px' });
  document.querySelectorAll('video.ambient-video[data-lazy]').forEach(v => videoLoader.observe(v));
}

// --- Kinetic typography: split hero headline into staggered words ---
if (!prefersReduced) {
  document.querySelectorAll('[data-kinetic]').forEach(el => {
    const wrap = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'k-word';
            w.textContent = part;
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrap(child);
        }
      });
    };
    wrap(el);
    el.querySelectorAll('.k-word').forEach((w, i) => w.style.setProperty('--d', `${0.15 + i * 0.09}s`));
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('kinetic-in')));
  });
}

// --- Carousel ---
window.scrollCarousel = dir => {
  const track = document.getElementById('productCarousel');
  track.scrollBy({ left: dir * 360, behavior: 'smooth' });
};
const carouselTrack = document.getElementById('productCarousel');
const carouselDots = document.querySelectorAll('#carouselDots span');
let currentDot = 0;
const syncDots = idx => {
  if (idx === currentDot) return;
  currentDot = idx;
  carouselDots.forEach((d, i) => {
    d.className = i === idx
      ? 'w-6 h-1.5 rounded-full bg-brand-forest transition-all'
      : 'w-1.5 h-1.5 rounded-full bg-brand-border transition-all';
  });
};
carouselTrack.addEventListener('scroll', () => {
  const max = carouselTrack.scrollWidth - carouselTrack.clientWidth;
  if (max <= 0) return;
  const idx = Math.min(carouselDots.length - 1, Math.floor((carouselTrack.scrollLeft / max) * carouselDots.length));
  syncDots(idx);
  const fadeL = document.querySelector('.carousel-fade-l');
  const fadeR = document.querySelector('.carousel-fade-r');
  if (fadeL) fadeL.classList.toggle('show', carouselTrack.scrollLeft > 8);
  if (fadeR) fadeR.classList.toggle('show', carouselTrack.scrollLeft < max - 8);
}, { passive: true });
carouselTrack.dispatchEvent(new Event('scroll'));

// --- Category filter ---
window.filterProducts = (btn, category) => {
  document.querySelectorAll('.category-pill').forEach(b => {
    b.classList.remove('bg-brand-forest', 'text-white');
    b.classList.add('text-brand-subtle');
    b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('bg-brand-forest', 'text-white');
  btn.classList.remove('text-brand-subtle');
  btn.setAttribute('aria-pressed', 'true');
  let visible = 0;
  document.querySelectorAll('.product-item').forEach(item => {
    const cats = item.dataset.category || '';
    const show = category === 'all' || cats.includes(category);
    item.style.display = show ? 'flex' : 'none';
    if (show) visible++;
  });
  document.getElementById('filterEmpty').classList.toggle('hidden', visible > 0);
  const track = document.getElementById('productCarousel');
  track.scrollTo({ left: 0 });
  syncDots(0);
};

// --- Quick view ---
const modal = document.getElementById('quickViewModal');
let modalTrigger = null;
window.openQuickView = (name, price, mrp, img, badge, desc, trigger) => {
  document.getElementById('modalTitle').textContent = name;
  document.getElementById('modalPrice').textContent = '₹' + price;
  document.getElementById('modalMrp').textContent = mrp ? '₹' + mrp : '';
  const modalImg = document.getElementById('modalImg');
  if (img) modalImg.src = img;
  modalImg.alt = name || '';
  document.getElementById('modalDesc').textContent = desc || '';
  document.getElementById('modalBadge').textContent = badge || 'Cold Pressed Batch';
  modalTrigger = trigger || null;
  modal.dataset.name = name; modal.dataset.price = price;
  modal.classList.remove('hidden'); modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  document.getElementById('modalCloseBtn').focus();
};
window.closeQuickView = () => {
  modal.classList.add('hidden'); modal.classList.remove('flex');
  document.body.style.overflow = '';
  if (modalTrigger) { modalTrigger.focus(); modalTrigger = null; }
};
modal.addEventListener('click', e => { if (e.target === modal) closeQuickView(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeQuickView(); });
document.getElementById('modalCloseBtn').addEventListener('click', closeQuickView);
modal.querySelector('#modalAddBtn').addEventListener('click', () => {
  quickAddProduct(modal.dataset.name, modal.dataset.price);
  closeQuickView();
});
document.querySelectorAll('.quick-view-btn').forEach(b =>
  b.addEventListener('click', () => openQuickView(b.dataset.name, b.dataset.price, b.dataset.mrp, b.dataset.img, b.dataset.badge, b.dataset.desc, b)));

// --- Cart + toast (peak-end moment) ---
let cartTotal = 0, cartItems = 0;
const cartCount = document.getElementById('cartCount');
const toast = document.getElementById('toast');
let toastTimer;
window.showToast = msg => {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
};
window.quickAddProduct = (name, price) => {
  cartItems += 1; cartTotal += Number(price);
  cartCount.textContent = String(cartItems);
  cartCount.classList.remove('hidden'); cartCount.classList.add('flex');
  showToast(`Added to Reserve Cart — ${name} · ₹${cartTotal}`);
};
document.querySelectorAll('.quick-add').forEach(b =>
  b.addEventListener('click', () => quickAddProduct(b.dataset.name, b.dataset.price)));

// --- Bull-driven ghani: orbit + walking legs (requestAnimationFrame) ---
(() => {
  const orbit = document.getElementById("bull-orbit");

  if (!orbit) {
    console.warn("Bull orbit element not found.");
    return;
  }

  const legs = [
    { id: "leg-front-far",  x: 15, y: 13, phase: 0 },
    { id: "leg-hind-near",  x: 55, y: 15, phase: 0 },
    { id: "leg-front-near", x: 21, y: 13, phase: Math.PI },
    { id: "leg-hind-far",   x: 48, y: 15, phase: Math.PI }
  ];

  const animatedLegs = legs.map(leg => ({
    ...leg,
    element: document.getElementById(leg.id)
  }));

  if (animatedLegs.some(leg => !leg.element)) {
    console.warn("One or more bull leg elements are missing.");
    return;
  }

  const orbitDuration = 20000; // one lap = 3 RPM
  const walkDuration = 1100;   // trot cycle
  const swingAngle = 22;       // forward/backward leg swing
  const liftHeight = 3.5;      // subtle hoof lift in SVG units

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let startTime = null;
  let frameId = null;

  function animate(timestamp) {
    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;

    // Bull and wooden beam orbit the press together (counter-clockwise).
    const angle = (elapsed % orbitDuration) / orbitDuration * 360;

    orbit.setAttribute("transform", `rotate(${-angle} 400 380)`);

    // Animate alternating diagonal pairs so the bull appears to trot.
    const cycle = elapsed / walkDuration * Math.PI * 2;

    animatedLegs.forEach(leg => {
      const stride = cycle + leg.phase;

      // Swing the leg forward and backward around its hip.
      const swing = Math.sin(stride) * swingAngle;

      // Lift the hoof during the forward swing.
      const lift = Math.max(0, Math.sin(stride)) * liftHeight;

      leg.element.setAttribute(
        "transform",
        `translate(0 ${-lift}) rotate(${swing} ${leg.x} ${leg.y})`
      );
    });

    frameId = requestAnimationFrame(animate);
  }

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function start() {
    stop();
    startTime = null;

    if (reducedMotion.matches) {
      orbit.setAttribute("transform", "rotate(0 400 380)");

      animatedLegs.forEach(leg => {
        leg.element.removeAttribute("transform");
      });

      return;
    }

    frameId = requestAnimationFrame(animate);
  }

  reducedMotion.addEventListener("change", start);
  start();
})();
