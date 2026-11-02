// Scroll and pointer motion for the home scenes, Apple-style: scroll sets targets, values glide toward them
// with inertia every frame, and only transform / opacity change. mount() is called after every route render.

const LERP = 0.14;           // share of the remaining distance covered per frame
const SETTLE = 0.0004;       // below this the value snaps to its target and the loop can sleep
const FAN_GAP_VW = 12.5;     // horizontal spacing between hero books
const FAN_TURN = 24;         // degrees each hero book turns per step from the centre
const BOOK_OPEN_DEG = 179;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let scene = null;            // elements of the current page; null when the page has no scenes
const state = {};
const target = {};
let pointer = { x: 0, y: 0 };
let running = false;
let observer = null;

function setTarget(key, value) { target[key] = value; if (!(key in state)) state[key] = value; }

function measure() {
  if (!scene) return;
  const vh = innerHeight;
  const { hero, words, pin, zooms, shelf } = scene;
  if (hero) setTarget("hero", clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight * 0.8)));
  if (words) { const r = words.el.getBoundingClientRect(); setTarget("words", clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3))); }
  if (pin) setTarget("pin", clamp(-pin.el.getBoundingClientRect().top / (pin.el.offsetHeight - vh)));
  zooms.forEach((z, i) => setTarget(`z${i}`, clamp((vh - z.getBoundingClientRect().top) / (vh * 0.7))));
  if (shelf) setTarget("shelf", clamp((vh - shelf.el.getBoundingClientRect().top) / (vh * 0.8)));
  setTarget("px", pointer.x); setTarget("py", pointer.y);
}

function renderFan({ fanIn, books }) {
  const h = state.hero ?? 0;
  fanIn.style.transform = `translateY(${h * 120}px) rotateX(${8 + h * 18 - state.py * 6}deg) rotateY(${state.px * 10}deg) scale(${1 - h * 0.12})`;
  books.forEach((b, i) => {
    const o = i - (books.length - 1) / 2, spread = 1 + h * 0.55;
    b.style.translate = "none";
    b.style.transform = `translate3d(calc(-50% + ${o * FAN_GAP_VW * spread}vw), calc(-50% + ${o * o * 10}px), ${-Math.abs(o) * (110 + h * 70)}px) rotateY(${o * FAN_TURN - 4}deg) rotateX(2deg) rotateZ(${o * 1.5}deg)`;
  });
}

function renderPin({ book, lid, floor, caps, dots }) {
  const p = state.pin ?? 0;
  const face = smooth(seg(p, 0, 0.32)), open = smooth(seg(p, 0.3, 0.74));
  const w = book.offsetWidth;
  book.style.transform = `translateX(${(-w / 2) * open}px) rotateX(${18 - 12 * face - 2 * open}deg) rotateY(${-38 + 38 * face}deg) rotateZ(${-7 + 7 * face}deg) scale(${0.8 + 0.2 * face})`;
  lid.style.setProperty("--open", String(BOOK_OPEN_DEG * open));
  floor.style.transform = `translateX(${(-w / 2) * open}px) scaleX(${1 + open * 0.95})`;
  const step = p < 0.3 ? 0 : p < 0.74 ? 1 : 2;
  caps.forEach((c, i) => c.classList.toggle("on", i === step));
  dots.forEach((d, i) => d.classList.toggle("on", i === step));
}

function render() {
  if (!scene) return;
  if (scene.fan) renderFan(scene.fan);
  if (scene.words) {
    const { spans } = scene.words, k = state.words ?? 0;
    spans.forEach((s, i) => { s.style.opacity = String(0.14 + 0.86 * smooth(clamp(k * (spans.length + 4) - i))); });
  }
  scene.zooms.forEach((z, i) => { const t = smooth(state[`z${i}`] ?? 1); z.style.transform = `scale(${0.92 + 0.08 * t})`; });
  if (scene.shelf) {
    const k0 = smooth(state.shelf ?? 1);
    scene.shelf.books.forEach((b, i) => { const k = smooth(clamp(k0 * 1.6 - i * 0.1)); b.style.transform = `rotateX(4deg) rotateY(${-70 + 46 * k}deg) translateY(${(1 - k) * 40}px)`; });
  }
  if (scene.pin) renderPin(scene.pin);
}

function tick() {
  let moving = false;
  for (const k in target) {
    const d = target[k] - state[k];
    if (Math.abs(d) > SETTLE) { state[k] += d * LERP; moving = true; } else state[k] = target[k];
  }
  render();
  if (moving) requestAnimationFrame(tick); else running = false;
}

function kick() { measure(); if (!running && scene) { running = true; requestAnimationFrame(tick); } }

function splitWords(el) {
  el.innerHTML = el.textContent.split(" ").map((w) => `<span class="w">${w}</span>`).join(" ");
  return [...el.querySelectorAll(".w")];
}

function collect(root) {
  const q = (s) => root.querySelector(s);
  const fan = q("[data-fan]"), wordsEl = q("[data-words]"), pinEl = q("[data-pin]"), shelfEl = q("[data-shelf]");
  return {
    hero: q("#hero"),
    fan: fan && { fanIn: fan.querySelector(".fan-in"), books: [...fan.querySelectorAll(".slot > .b3")] },
    words: wordsEl && { el: wordsEl, spans: splitWords(wordsEl) },
    pin: pinEl && { el: pinEl, book: pinEl.querySelector(".ob"), lid: pinEl.querySelector(".lid"), floor: pinEl.querySelector(".ob-floor"), caps: [...pinEl.querySelectorAll(".caps div")], dots: [...pinEl.querySelectorAll(".dots i")] },
    zooms: [...root.querySelectorAll("[data-zoom]")],
    shelf: shelfEl && { el: shelfEl, books: [...shelfEl.querySelectorAll(".b3")] },
  };
}

function watchReveals(root) {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
  }), { rootMargin: "0px 0px -10% 0px" });
  root.querySelectorAll(".rv").forEach((el) => observer.observe(el));
}

/** Bind the scenes found in root (the freshly rendered view). Safe to call on every route. */
export function mount(root) {
  for (const k in state) delete state[k];
  for (const k in target) delete target[k];
  watchReveals(root);
  if (reduced()) { root.querySelectorAll(".rv").forEach((el) => el.classList.add("in")); scene = null; return; }
  scene = collect(root);
  measure();
  Object.assign(state, target);
  render();
}

/** Install the global listeners once. */
export function startMotion() {
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  addEventListener("pointermove", (e) => { pointer = { x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 }; if (scene?.fan) kick(); }, { passive: true });
}
