// Home page markup. Motion for these scenes lives in ../motion.js.
import { ALL, COURSES, BOOKS, card } from "../catalog.js";
import { esc, ils } from "../util.js";
import { REFUND_DAYS, BOOK_DEAL_MIN } from "../business.js";
import { book3d, bookStage } from "../book3d.js";
import { t, tList } from "../i18n/index.js";
import * as D from "./home-data.js";

const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const link = (href, text) => `<a class="lnk" href="${href}"><span>${text}</span></a>`;
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
// Some products don't exist in every language (e.g. the English-learning books on the English site).
const pick = (ids) => ids.map((id) => ALL[id]).filter(Boolean);
const countIn = (nums) => [...COURSES, ...BOOKS].filter((p) => nums.includes(p.n)).length;

const hero = () => `
  <header class="hero" id="hero"><div class="wash"></div>
    <div class="wrap center">
      <div class="kicker load">${t("home.kicker")}</div>
      <h1 class="load d1">${t("home.h1a")}<br><span class="grad">${t("home.h1b")}</span></h1>
      <p class="sub load d2">${t("home.sub")}</p>
      <div class="ctas load d3"><a class="btn btn-ink" href="#courses">${t("home.ctaCourses")}</a>${link("#books", t("home.ctaBooks"))}</div>
    </div>
    <div class="fan" data-fan><div class="fan-in">${pick(D.HERO_FAN).map((p, i) => `<div class="slot" style="animation-delay:${0.25 + Math.abs(i - 2) * 0.12}s">${book3d(p)}</div>`).join("")}</div><div class="floor"></div></div>
  </header>`;

const stack = (ids, turns, style = "") => `<div class="stack">${pick(ids).map((p, i) => `<div>${book3d(p, { style: `--w:clamp(120px,11.5vw,165px);--ry:${turns[i]}deg;${style}` })}</div>`).join("")}</div>`;
const sheet = (n, style) => `<div class="sheet" style="${style}">${"<i></i>".repeat(n)}</div>`;

const tiles = () => `
  <section class="tiles">
    <div class="tile" data-zoom><div class="glow" style="background:radial-gradient(70% 50% at 50% 85%,rgba(255,206,226,.7),transparent 70%)"></div>
      <h2>${t("home.tileCourses")}</h2><p class="kicker">${t("home.tileCoursesSub")}</p>
      <div class="links">${link("#courses", t("home.allCourses"))}${link(`#${D.TILE_COURSE}`, t("home.whatsInCourse"))}</div>
      <div class="obj"><div class="bookbox">${sheet(5, "transform:translate(-62%,-6%) rotate(-9deg)")}${sheet(6, "transform:translate(58%,4%) rotate(8deg)")}${book3d(ALL[D.TILE_COURSE], { style: "--w:clamp(170px,17vw,230px);--ry:-18deg" })}<div class="floor"></div></div></div></div>
    <div class="tile" data-zoom><div class="glow" style="background:radial-gradient(70% 50% at 50% 85%,rgba(196,224,255,.75),transparent 70%)"></div>
      <h2>${t("home.tileBooks")}</h2><p class="kicker">${t("home.tileBooksSub", { n: BOOKS.length })}</p>
      <div class="links">${link("#books", t("home.toShelf"))}${link(`#${D.OPEN_BOOK}`, t("home.freePeek"))}</div>
      <div class="obj"><div class="bookbox">${stack(D.TILE_BOOKS, [-34, -20, -6])}<div class="floor"></div></div></div></div>
    <div class="tile full dark" data-zoom><div class="glow" style="background:radial-gradient(40% 60% at 70% 80%,rgba(194,85,138,.45),transparent 70%),radial-gradient(40% 60% at 30% 80%,rgba(107,72,214,.5),transparent 70%)"></div>
      <h2>${t("home.dealA")} <span class="grad">${t("home.dealB")}</span></h2><p class="kicker">${t("home.dealSub", { n: BOOK_DEAL_MIN })}</p>
      <div class="links">${link("#books", t("home.dealCta"))}</div>
      <div class="obj"><div class="bookbox">${stack(D.TILE_DEAL, [-30, -18, -6], "--rx:6deg")}<div class="floor" style="background:radial-gradient(closest-side,rgba(0,0,0,.6),transparent)"></div></div></div></div>
  </section>`;

function worlds() {
  const text = tList("home.worlds");
  const all = [...COURSES, ...BOOKS];
  const cards = D.WORLDS.map((w, i) => {
    const p = ALL[w.book] || all.find((x) => w.nums.includes(x.n));
    if (!p) return "";
    const [title, blurb] = text[i] || ["", ""];
    return `<a class="world" href="#books" data-act="pick-cat" data-cat="${esc(p.cat)}"><div class="glow" style="background:linear-gradient(180deg,${w.glow})"></div>
      <span class="eb">${t("home.items", { n: countIn(w.nums) })}</span><h3>${esc(title)}</h3><p>${esc(blurb)}</p>${bookStage(p, { style: "--ry:-22deg" })}<span class="plus">${icon("i-plus")}</span></a>`;
  });
  return `<section class="sec">
    <div class="wrap sec-title"><h2 class="rv">${t("home.topicsA")} <span>${t("home.topicsB")}</span></h2>
      <div class="rail-nav rv d1"><button data-act="rail" data-dir="back" aria-label="${t("home.prev")}">${icon("i-back")}</button><button data-act="rail" data-dir="next" aria-label="${t("home.next")}">${icon("i-fwd")}</button></div></div>
    <div class="rail" id="rail">${cards.join("")}</div>
  </section>`;
}

function openBook() {
  const p = ALL[D.OPEN_BOOK];
  const first = p.excerpt.split(/(?<=[.!?؟])\s+/).slice(0, 3).join(" ");
  const caps = tList("home.captions");
  return `
  <section class="pin" data-pin><div class="stage"><div class="wash"></div>
    <h2>${t("home.openA")}<br><span class="grad">${t("home.openB")}</span></h2>
    <div class="book-world"><div class="ob" style="--bg:${p.cv[0]}">
      <div class="back"></div><div class="block"></div>
      <div class="leaf"><div class="page"><h4>${t("home.exerciseTitle")}</h4><p>${t("home.exerciseText")}</p>${'<div class="ln"></div>'.repeat(6)}<div class="no">13</div></div></div>
      <div class="lid"><div class="out">${book3d(p)}</div><div class="in"><div class="page"><h4>${esc(p.chapters[1] || p.title)}</h4><p>${esc(first)}</p><div class="no">12</div></div></div></div>
    </div><div class="ob-floor"></div></div>
    <div class="caps">${caps.map(([b, s], i) => `<div class="${i ? "" : "on"}"><b>${b}</b><span>${s}</span></div>`).join("")}</div>
    <div class="dots" aria-hidden="true">${caps.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>
  </div></section>`;
}

const shelf = () => `
  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec-title"><h2 class="rv">${t("home.shelfA")} <span>${t("home.shelfB")}</span></h2>${link("#books", t("home.allBooks"))}</div>
    <div class="shelf" data-shelf>${pick(D.HOME_SHELF).map((p) => `<a class="it" href="#${p.id}">${bookStage(p)}<div><b>${esc(p.title)}</b><small>${t(`kind.short.${p.type}`)} · ${ils(p.price)}</small></div></a>`).join("")}</div>
  </div></section>`;

const promises = () => tList("home.promises").map(([b, s], i) => `<div class="promise rv d${i}"><div class="ic">${icon(D.PROMISE_ICONS[i])}</div><b>${fill(b, { days: REFUND_DAYS })}</b><p>${s}</p></div>`).join("");
const faq = () => tList("home.faqList").map(([q, a], i) => `<details${i ? "" : " open"}><summary>${esc(q)}<span>${icon("i-plus")}</span></summary><p>${esc(fill(a, { days: REFUND_DAYS }))}</p></details>`).join("");

export function viewHome() {
  return `${hero()}
  <section class="statement"><div class="wrap"><p data-words>${esc(t("home.statement"))}</p></div></section>
  ${tiles()}${worlds()}${openBook()}
  <section class="sec" style="padding-top:40px"><div class="wrap">
    <div class="sec-title"><h2 class="rv">${t("home.coursesA")} <span>${t("home.coursesB")}</span></h2>${link("#courses", t("home.allCoursesN", { n: COURSES.length }))}</div>
    <div class="grid">${pick(D.HOME_COURSES).map(card).join("")}</div>
  </div></section>
  ${shelf()}
  <section class="sec" style="padding-top:0"><div class="wrap">
    <h2 class="rv center" style="font-size:clamp(32px,3.8vw,50px);margin-bottom:60px">${t("home.why")}</h2>
    <div class="promises">${promises()}</div>
  </div></section>
  <section class="sec" style="padding-top:0"><div class="wrap">
    <h2 class="rv center" style="font-size:clamp(32px,3.8vw,50px);margin-bottom:36px">${t("home.faq")}</h2>
    <div class="faq rv d1">${faq()}</div>
  </div></section>`;
}
