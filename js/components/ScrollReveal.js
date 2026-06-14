import { qsAll } from '../utils/domUtils.js';

/** Adds a visible class to elements when they scroll into the viewport.
 *  Configurable via options object — extendable without modification. (OCP)
 */
export class ScrollReveal {
  #selector;
  #options;
  #observer = null;

  static #defaults = {
    threshold:    0.15,
    rootMargin:   '0px 0px -50px 0px',
    once:         true,
    visibleClass: 'reveal--visible',
  };

  constructor(selector, options = {}) {
    this.#selector = selector;
    this.#options  = { ...ScrollReveal.#defaults, ...options };
  }

  init() {
    const { threshold, rootMargin, once, visibleClass } = this.#options;

    this.#observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(visibleClass);
          if (once) this.#observer.unobserve(entry.target);
        });
      },
      { threshold, rootMargin }
    );

    qsAll(this.#selector).forEach((el) => this.#observer.observe(el));
  }

  destroy() {
    this.#observer?.disconnect();
  }
}
