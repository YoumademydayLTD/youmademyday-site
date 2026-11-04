// Our own line icons (24px grid, drawn as strokes). Path data only; dom.svgIcon turns them into SVG.
import { svgIcon } from './dom.js';

const PATHS = Object.freeze({
  // Points to the start side; in RTL that is "back" (right). CSS mirrors it for LTR.
  back: ['M9 5l7 7-7 7'],
  send: ['M20 4 3 11l7 3 3 7 7-17Z', 'M10 14l4-4'],
  photo: ['M4 6h16v12H4z', 'M4 15l4-4 4 4 3-3 5 5', 'M15.5 9.5h.01'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  reopen: ['M4 12a8 8 0 1 0 2.5-5.8', 'M4 4v4.5h4.5'],
  trash: ['M5 7h14', 'M10 7V5h4v2', 'M7 7l1 12h8l1-12'],
  plus: ['M12 5v14', 'M5 12h14'],
  bolt: ['M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z'],
  logout: ['M10 5H5v14h5', 'M14 8l4 4-4 4', 'M18 12H9'],
  file: ['M7 3h7l4 4v14H7z', 'M14 3v4h4'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'M13.5 6.5l4 4'],
  chat: ['M5 5h14v10H10l-4 4v-4H5z'],
  book: ['M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z', 'M5 17a3 3 0 0 1 3-3h9'],
});

/** @typedef {keyof typeof PATHS} IconName */

/**
 * @param {IconName} name
 * @returns {SVGSVGElement}
 */
export function icon(name) {
  return svgIcon(PATHS[name]);
}
