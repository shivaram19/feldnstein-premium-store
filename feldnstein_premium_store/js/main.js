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
  menuBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
};
menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', String(!open));
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
// Note: empty section placeholders (until Tasks 6-9 fill them) may cause multiple simultaneous intersections; this resolves once sections have height.
const navLinks = document.querySelectorAll('.nav-link');
const spyTargets = [...new Set([...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean))];
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => {
        const active = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('text-brand-forest', active);
        if (active) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
spyTargets.forEach(t => spy.observe(t));

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
  document.getElementById('modalMrp').textContent = mrp ? '₹' + mrp : '';
  document.getElementById('modalImg').src = img;
  document.getElementById('modalBadge').textContent = badge || 'Cold Pressed Batch';
  modal.dataset.name = name; modal.dataset.price = price;
  modal.classList.remove('hidden'); modal.classList.add('flex');
};
window.closeQuickView = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
modal.addEventListener('click', e => { if (e.target === modal) closeQuickView(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuickView(); });
modal.querySelector('#modalAddBtn').addEventListener('click', () => {
  quickAddProduct(modal.dataset.name, modal.dataset.price);
  closeQuickView();
});
document.querySelectorAll('.quick-view-btn').forEach(b =>
  b.addEventListener('click', () => openQuickView(b.dataset.name, b.dataset.price, b.dataset.mrp, b.dataset.img, b.dataset.badge)));

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
document.querySelectorAll('.quick-add').forEach(b =>
  b.addEventListener('click', () => quickAddProduct(b.dataset.name, b.dataset.price)));
