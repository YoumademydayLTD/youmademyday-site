// Small pure helpers shared by every view.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const TOAST_MS = 2600;

export const esc = (value) => String(value).replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);
export const ils = (amount) => `${Math.round(amount).toLocaleString("he-IL")} ₪`;
export const $ = (selector) => document.querySelector(selector);

let toastTimer;
export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, TOAST_MS);
}

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
