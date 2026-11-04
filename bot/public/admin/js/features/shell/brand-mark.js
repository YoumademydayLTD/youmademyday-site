// The store's logo mark (same drawing as site/icons/favicon.svg), as a decorative image.
import { h } from '../../core/dom.js';

const MARK_SRC = '/admin/favicon.svg';

/** @returns {HTMLImageElement} */
export function brandMark() {
  return /** @type {HTMLImageElement} */ (h('img', { class: 'brand-mark', src: MARK_SRC, alt: '', width: '44', height: '44' }));
}
