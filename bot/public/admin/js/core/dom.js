// Tiny DOM builder. Every piece of text goes in as a text node, so customer text can never become markup.

/** Keys set as DOM properties rather than attributes (their live state lives on the property). */
const PROPERTY_KEYS = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'files']);

/**
 * Creates an element.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, unknown> | null} [props] `class`, `dataset`, `on<event>` handlers, properties or attributes.
 * @param {...unknown} children nodes, strings, numbers, arrays of them; null / undefined / false are skipped
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props ?? {});
  append(el, children);
  return el;
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 */
function applyProps(el, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.setAttribute('class', String(value));
    else if (key === 'dataset') Object.assign(/** @type {HTMLElement} */ (el).dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), /** @type {EventListener} */ (value));
    else if (PROPERTY_KEYS.has(key)) Reflect.set(el, key, value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
}

/**
 * Appends children; strings and numbers become text nodes.
 * @param {Element} el
 * @param {unknown[]} children
 */
export function append(el, children) {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * Replaces all children of an element.
 * @param {Element} el
 * @param {...unknown} children
 */
export function replace(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Builds an inline icon from path data (no innerHTML, no external files).
 * @param {readonly string[]} paths
 * @param {{ fill?: boolean }} [options] filled shapes instead of 1.8px strokes
 * @returns {SVGSVGElement}
 */
export function svgIcon(paths, options = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'ico');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    if (options.fill) path.setAttribute('fill', 'currentColor');
    else {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.8');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
    }
    svg.append(path);
  }
  return svg;
}

/**
 * Reads the polite live region and says a short sentence to screen readers.
 * @param {string} text
 */
export function announce(text) {
  const region = document.getElementById('announcer');
  if (!region) return;
  // Clearing first makes screen readers repeat the same sentence when it comes twice.
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = text; });
}
