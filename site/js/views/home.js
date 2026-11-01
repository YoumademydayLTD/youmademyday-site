// Home page.
import { COURSES, BOOKS, card, cover } from "../catalog.js";
import { esc } from "../util.js";
import { REFUND_DAYS, BOOK_DEAL_MIN } from "../business.js";

const HOME_COURSES = 4;
const HOME_BOOKS = 6;

const FAQ = [
  ["איך מקבלים את מה שקניתי?", "מיד אחרי התשלום נשלח אליכם מייל עם קישור להורדה. ספרים ותבניות מגיעים כקובצי PDF, וקורס מגיע כשיעורים כתובים ודפי עבודה."],
  ["לכמה זמן יש גישה?", "הקבצים שלכם לתמיד. מורידים, שומרים, ופותחים בכל מכשיר מתי שרוצים."],
  ["אפשר לקרוא בטלפון?", "כן. קובצי PDF נפתחים בכל טלפון, טאבלט ומחשב, ואפשר גם להדפיס."],
  ["מה אם זה לא מתאים לי?", `בקורסים יש ${REFUND_DAYS} יום להחזר מלא. בספר דיגיטלי אפשר לבטל עד ההורדה הראשונה, ולכל ספר יש הצצה חינם בעמוד שלו.`],
  ["מי כותב את התוכן?", "אנחנו. כל קורס וכל ספר באתר נכתבו והופקו על ידי צוות You Made My Day. אנחנו לא מוכרים תוכן של אחרים."],
];

function categories() {
  const all = [...COURSES, ...BOOKS];
  return [...new Set(all.map((p) => p.cat))].map((cat) => ({ cat, count: all.filter((p) => p.cat === cat).length }));
}

export function viewHome() {
  const heroCovers = [BOOKS[0], COURSES[0], BOOKS[1]].filter(Boolean);
  return `
  <section class="hero"><div class="wrap hero-in">
    <div>
      <h1>משהו קטן<br>שיעשה לך<br><em>את היום.</em></h1>
      <p class="lead">קורסים דיגיטליים וספרים מעשיים בעברית, שאנחנו כותבים ומפיקים בעצמנו. מורידים מיד, קוראים מכל מכשיר, ושומרים לתמיד.</p>
      <div class="hero-ctas"><a class="btn btn-ink" href="#courses">לקורסים</a><a class="btn btn-ghost" href="#books">לספרים ולתבניות</a></div>
      <div class="hero-stats num">
        <div><b>${COURSES.length}</b><span>קורסים</span></div>
        <div><b>${BOOKS.length}</b><span>ספרים, תבניות וחבילות</span></div>
        <div><b>PDF</b><span>מגיע מיד למייל</span></div>
        <div><b>${REFUND_DAYS}</b><span>ימים להחזר בקורסים</span></div>
      </div>
    </div>
    <div class="hero-stack" aria-hidden="true">${heroCovers.map((p) => cover(p)).join("")}</div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="sec-head"><div><h2>הקורסים שלנו</h2><p class="muted">שיעורים כתובים צעד אחר צעד, עם משימה ודף עבודה בכל שיעור</p></div><a class="more" href="#courses">לכל הקורסים</a></div>
    <div class="grid courses-g">${COURSES.slice(0, HOME_COURSES).map(card).join("")}</div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2>לפי נושא</h2></div>
    <div class="cats">${categories().map(({ cat, count }) => `<a class="cat" href="#books" data-act="pick-cat" data-cat="${esc(cat)}">${esc(cat)}<span>${count} פריטים</span></a>`).join("")}</div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><h2>ספרים ותבניות</h2><p class="muted">קובצי PDF שנפתחים בכל מכשיר ומגיעים למייל מיד אחרי התשלום</p></div><a class="more" href="#books">לכל הספרים</a></div>
    <div class="grid books">${BOOKS.slice(0, HOME_BOOKS).map(card).join("")}</div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap">
    <div class="bundle">
      <div><h2>${BOOK_DEAL_MIN} ספרים? הזול עלינו.</h2><p>שמים בסל ${BOOK_DEAL_MIN} ספרים או תבניות, והזול מביניהם יוצא בחינם. ההנחה נכנסת לבד.</p></div>
      <a class="btn btn-sun" href="#books">לבחור ספרים</a>
    </div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2>שאלות נפוצות</h2></div>
    <div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>`;
}
