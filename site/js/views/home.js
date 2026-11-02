// Home page markup. Motion for these scenes lives in ../motion.js.
import { ALL, COURSES, BOOKS, card } from "../catalog.js";
import { esc, ils } from "../util.js";
import { REFUND_DAYS, BOOK_DEAL_MIN } from "../business.js";
import { book3d, bookStage } from "../book3d.js";
import * as D from "./home-data.js";

const FAQ = [
  ["איך מקבלים את מה שקניתי?", "מיד אחרי התשלום נשלח אליכם מייל עם קישור להורדה. ספרים ותבניות מגיעים כקובצי PDF, וקורס מגיע כשיעורים כתובים ודפי עבודה."],
  ["לכמה זמן יש גישה?", "הקבצים שלכם לתמיד. מורידים, שומרים, ופותחים בכל מכשיר מתי שרוצים."],
  ["אפשר לקרוא בטלפון?", "כן. קובצי PDF נפתחים בכל טלפון, טאבלט ומחשב, ואפשר גם להדפיס."],
  ["מה אם זה לא מתאים לי?", `בקורסים יש ${REFUND_DAYS} יום להחזר מלא. בספר דיגיטלי אפשר לבטל עד ההורדה הראשונה, ולכל ספר יש הצצה חינם בעמוד שלו.`],
  ["מי כותב את התוכן?", "אנחנו. כל קורס וכל ספר באתר נכתבו והופקו על ידי צוות You Made My Day. אנחנו לא מוכרים תוכן של אחרים."],
];
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const link = (href, text) => `<a class="lnk" href="${href}"><span>${text}</span></a>`;
const countIn = (cats) => [...COURSES, ...BOOKS].filter((p) => cats.includes(p.cat)).length;

const hero = () => `
  <header class="hero" id="hero"><div class="wash"></div>
    <div class="wrap center">
      <div class="kicker load">קורסים וספרים דיגיטליים בעברית</div>
      <h1 class="load d1">משהו קטן שיעשה לך<br><span class="grad">את היום.</span></h1>
      <p class="sub load d2">כל עמוד נכתב, נערך ומעוצב אצלנו. מגיע אליך בקובץ PDF מיד אחרי התשלום, ונשאר שלך לתמיד.</p>
      <div class="ctas load d3"><a class="btn btn-ink" href="#courses">לקורסים</a>${link("#books", "לספרים ולתבניות")}</div>
    </div>
    <div class="fan" data-fan><div class="fan-in">${D.HERO_FAN.map((id, i) => `<div class="slot" style="animation-delay:${0.25 + Math.abs(i - 2) * 0.12}s">${book3d(ALL[id])}</div>`).join("")}</div><div class="floor"></div></div>
  </header>`;

const stack = (ids, turns, style = "") => `<div class="stack">${ids.map((id, i) => `<div>${book3d(ALL[id], { style: `--w:clamp(120px,11.5vw,165px);--ry:${turns[i]}deg;${style}` })}</div>`).join("")}</div>`;

const tiles = () => `
  <section class="tiles">
    <div class="tile" data-zoom><div class="glow" style="background:radial-gradient(70% 50% at 50% 85%,rgba(255,206,226,.7),transparent 70%)"></div>
      <h2>קורסים</h2><p class="kicker">שיעורים כתובים. דף עבודה לכל שיעור.</p>
      <div class="links">${link("#courses", "לכל הקורסים")}${link(`#${D.TILE_COURSE}`, "מה כולל קורס")}</div>
      <div class="obj"><div class="bookbox"><div class="sheet" style="transform:translate(-62%,-6%) rotate(-9deg)"><i></i><i></i><i></i><i></i><i></i></div><div class="sheet" style="transform:translate(58%,4%) rotate(8deg)"><i></i><i></i><i></i><i></i><i></i><i></i></div>${book3d(ALL[D.TILE_COURSE], { style: "--w:clamp(170px,17vw,230px);--ry:-18deg" })}<div class="floor"></div></div></div></div>
    <div class="tile" data-zoom><div class="glow" style="background:radial-gradient(70% 50% at 50% 85%,rgba(196,224,255,.75),transparent 70%)"></div>
      <h2>ספרים ותבניות</h2><p class="kicker">${BOOKS.length} קובצי PDF. לקריאה, לכתיבה ולהדפסה.</p>
      <div class="links">${link("#books", "למדף הספרים")}${link(`#${D.OPEN_BOOK}`, "הצצה חינם")}</div>
      <div class="obj"><div class="bookbox">${stack(D.TILE_BOOKS, [-34, -20, -6])}<div class="floor"></div></div></div></div>
    <div class="tile full dark" data-zoom><div class="glow" style="background:radial-gradient(40% 60% at 70% 80%,rgba(194,85,138,.45),transparent 70%),radial-gradient(40% 60% at 30% 80%,rgba(107,72,214,.5),transparent 70%)"></div>
      <h2>שלושה ספרים? <span class="grad">הזול עלינו.</span></h2><p class="kicker">שמים ${BOOK_DEAL_MIN} ספרים או תבניות בסל, והזול מביניהם יוצא בחינם. בלי קוד.</p>
      <div class="links">${link("#books", "לבחור ספרים")}</div>
      <div class="obj"><div class="bookbox">${stack(D.TILE_DEAL, [-30, -18, -6], "--rx:6deg")}<div class="floor" style="background:radial-gradient(closest-side,rgba(0,0,0,.6),transparent)"></div></div></div></div>
  </section>`;

const worlds = () => `
  <section class="sec">
    <div class="wrap sec-title"><h2 class="rv">לפי נושא. <span>מה מעניין אותך היום.</span></h2>
      <div class="rail-nav rv d1"><button data-act="rail" data-dir="back" aria-label="הקודם">${icon("i-right")}</button><button data-act="rail" data-dir="next" aria-label="הבא">${icon("i-left")}</button></div></div>
    <div class="rail" id="rail">${D.WORLDS.map((w) => `<a class="world" href="#books" data-act="pick-cat" data-cat="${esc(w.cats[0])}"><div class="glow" style="background:linear-gradient(180deg,${w.glow})"></div>
      <span class="eb">${countIn(w.cats)} פריטים</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p>${bookStage(ALL[w.book], { style: "--ry:-22deg" })}<span class="plus">${icon("i-plus")}</span></a>`).join("")}</div>
  </section>`;

function openBook() {
  const p = ALL[D.OPEN_BOOK];
  const first = p.excerpt.split(". ").slice(0, 3).join(". ") + ".";
  return `
  <section class="pin" data-pin><div class="stage"><div class="wash"></div>
    <h2>פותחים.<br><span class="grad">וזה כבר שלך.</span></h2>
    <div class="book-world"><div class="ob" style="--bg:${p.cv[0]}">
      <div class="back"></div><div class="block"></div>
      <div class="leaf"><div class="page"><h4>תרגיל: יומן המחמצת</h4><p>רשמו בכל יום מתי האכלתם ואיך המחמצת נראית.</p><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="no">13</div></div></div>
      <div class="lid"><div class="out">${book3d(p)}</div><div class="in"><div class="page"><h4>${esc(p.chapters[1] || p.title)}</h4><p>${esc(first)}</p><div class="no">12</div></div></div></div>
    </div><div class="ob-floor"></div></div>
    <div class="caps">${D.CAPTIONS.map(([b, s], i) => `<div class="${i ? "" : "on"}"><b>${b}</b><span>${s}</span></div>`).join("")}</div>
    <div class="dots">${D.CAPTIONS.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>
  </div></section>`;
}

const shelf = () => `
  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec-title"><h2 class="rv">המדף. <span>חדש מההוצאה שלנו.</span></h2>${link("#books", "לכל הספרים")}</div>
    <div class="shelf" data-shelf>${D.HOME_SHELF.map((id) => { const p = ALL[id]; return `<a class="it" href="#${id}">${bookStage(p)}<div><b>${esc(p.title)}</b><small>${p.type === "template" ? "תבנית" : "ספר"} · ${ils(p.price)}</small></div></a>`; }).join("")}</div>
  </div></section>`;

export function viewHome() {
  return `${hero()}
  <section class="statement"><div class="wrap"><p data-words>${esc(D.STATEMENT)}</p></div></section>
  ${tiles()}${worlds()}${openBook()}
  <section class="sec" style="padding-top:40px"><div class="wrap">
    <div class="sec-title"><h2 class="rv">הקורסים. <span>ללמוד בקצב שלך.</span></h2>${link("#courses", `לכל ${COURSES.length} הקורסים`)}</div>
    <div class="grid">${D.HOME_COURSES.map((id) => card(ALL[id])).join("")}</div>
  </div></section>
  ${shelf()}
  <section class="sec" style="padding-top:0"><div class="wrap">
    <h2 class="rv center" style="font-size:clamp(32px,3.8vw,50px);margin-bottom:60px">למה לקנות אצלנו.</h2>
    <div class="promises">${D.PROMISES.map(([ic, b, t], i) => `<div class="promise rv d${i}"><div class="ic">${icon(ic)}</div><b>${b}</b><p>${t}</p></div>`).join("")}</div>
  </div></section>
  <section class="sec" style="padding-top:0"><div class="wrap">
    <h2 class="rv center" style="font-size:clamp(32px,3.8vw,50px);margin-bottom:36px">שאלות נפוצות.</h2>
    <div class="faq rv d1">${FAQ.map(([q, a], i) => `<details${i ? "" : " open"}><summary>${esc(q)}<span>${icon("i-plus")}</span></summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>`;
}
