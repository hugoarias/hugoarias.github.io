import { qs, qsAll } from '../utils/domUtils.js';

/** Manages sticky scroll detection, hamburger menu, active link
 *  highlighting, and smooth scroll. Single responsibility.
 */
export class Navbar {
  #header;
  #hamburger;
  #menu;
  #links;
  #sentinel;

  constructor(headerEl) {
    this.#header    = headerEl;
    this.#hamburger = qs('.navbar__hamburger', headerEl);
    this.#menu      = qs('.navbar__menu', headerEl);
    this.#links     = qsAll('.navbar__link', headerEl);
    this.#sentinel  = qs('#scroll-sentinel');
  }

  init() {
    this.#initStickyScroll();
    this.#initHamburger();
    this.#initActiveLinks();
    this.#initSmoothScroll();
  }

  #initStickyScroll() {
    if (!this.#sentinel) return;
    new IntersectionObserver(([entry]) => {
      this.#header.classList.toggle('navbar--scrolled', !entry.isIntersecting);
    }).observe(this.#sentinel);
  }

  #initHamburger() {
    if (!this.#hamburger) return;

    this.#hamburger.addEventListener('click', () => {
      const isOpen = this.#hamburger.getAttribute('aria-expanded') === 'true';
      this.#setMenuOpen(!isOpen);
    });

    this.#links.forEach((link) => {
      link.addEventListener('click', () => this.#setMenuOpen(false));
    });

    document.addEventListener('click', (e) => {
      if (!this.#header.contains(e.target)) this.#setMenuOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.#setMenuOpen(false);
    });
  }

  #setMenuOpen(open) {
    this.#hamburger.setAttribute('aria-expanded', String(open));
    this.#menu.classList.toggle('navbar__menu--open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  #initActiveLinks() {
    const sections = qsAll('section[id]');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          this.#links.forEach((link) => {
            link.classList.toggle(
              'navbar__link--active',
              link.getAttribute('href') === `#${entry.target.id}`
            );
          });
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((s) => observer.observe(s));
  }

  #initSmoothScroll() {
    this.#links.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', href);
      });
    });
  }
}
