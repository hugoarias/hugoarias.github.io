/** querySelector with optional context root. */
export function qs(selector, context = document) {
  return context.querySelector(selector);
}

/** querySelectorAll returning a plain Array. */
export function qsAll(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/** Factory pattern: creates a DOM element with attributes and children.
 *  @param {string} tag
 *  @param {Record<string, string>} attrs
 *  @param {Array<string|Node>} children
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'class') {
      el.className = val;
    } else {
      el.setAttribute(key, val);
    }
  });
  children.forEach((child) => {
    el.appendChild(
      typeof child === 'string' ? document.createTextNode(child) : child
    );
  });
  return el;
}
