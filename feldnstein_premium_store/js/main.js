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
