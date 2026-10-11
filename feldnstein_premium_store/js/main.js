'use strict';

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
