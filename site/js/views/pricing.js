// Pricing page: every price in one place.
import { COURSES, BOOKS, ALL } from "../catalog.js";
import { esc, ils } from "../util.js";
import { BOOK_DEAL_MIN, REFUND_DAYS } from "../business.js";

const KIND = { course: "קורס", ebook: "ספר PDF", template: "תבנית", bundle: "חבילה" };

const rows = (list) => list.map((p) => `<tr><td><a href="#${p.id}">${esc(p.title)}</a></td><td>${KIND[p.type]}</td><td>${esc(p.cat)}</td><td class="num"><b>${ils(p.price)}</b></td></tr>`).join("");
const table = (title, list) => `<h3 style="margin:18px 0 10px">${title}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>שם</th><th>סוג</th><th>נושא</th><th class="num">מחיר</th></tr></thead><tbody>${rows(list)}</tbody></table></div>`;

export function viewPricing() {
  const cheapest = (list) => Math.min(...list.map((p) => p.price));
  const bundles = BOOKS.filter((p) => p.type === "bundle");
  const singles = BOOKS.filter((p) => p.type !== "bundle");
  return `<div class="wrap page-head"><h1>מחירים</h1><p class="muted" style="margin:6px 0 0;max-width:60ch">משלמים פעם אחת, והקבצים שלכם לתמיד. כל המחירים בשקלים וכוללים מע״מ. אין מנויים ואין חיובים חוזרים.</p></div>
  <div class="wrap" style="display:flex;flex-direction:column;gap:40px;padding-bottom:48px">
    <div class="plans">
      <div class="plan"><h3>קורס</h3><div class="big num">${cheapest(COURSES)}<small> ₪ ומעלה</small></div>
        <ul class="incl"><li>שיעורים כתובים עם משימות</li><li>דף עבודה לכל שיעור</li><li>קובצי PDF להורדה</li><li>${REFUND_DAYS} יום להחזר מלא</li></ul>
        <a class="btn btn-ghost btn-block" href="#courses">לקורסים</a></div>
      <div class="plan"><h3>ספר או תבנית</h3><div class="big num">${cheapest(singles)}<small> ₪ ומעלה</small></div>
        <ul class="incl"><li>קובץ PDF להורדה מיידית</li><li>נפתח בכל מכשיר ואפשר להדפיס</li><li>${BOOK_DEAL_MIN} ספרים בסל: הזול חינם</li></ul>
        <a class="btn btn-ghost btn-block" href="#books">לספרים</a></div>
      <div class="plan"><h3>חבילות</h3><div class="big num">${bundles.length}<small> חבילות</small></div>
        <ul class="incl">${bundles.map((b) => `<li>${esc(b.title)}: ${ils(b.price)} במקום ${ils(b.includes.reduce((s, id) => s + (ALL[id]?.price || 0), 0))}</li>`).join("")}</ul>
        <a class="btn btn-ghost btn-block" href="#books">לחבילות</a></div>
    </div>
    <div><div class="sec-head" style="margin-bottom:0"><h2>כל המחירים</h2></div>${table("קורסים", COURSES)}${table("ספרים, תבניות וחבילות", BOOKS)}</div>
    <div class="panel"><h2>איך משלמים</h2><ul class="incl">
      <li>בכרטיס אשראי, דרך ספק סליקה מאובטח. אנחנו לא שומרים את מספר הכרטיס.</li>
      <li>חשבונית וקישורי הורדה נשלחים למייל מיד אחרי התשלום.</li>
      <li>המחיר שמחייב הוא המחיר שהופיע ברגע ההזמנה.</li>
      <li>ההחזרים מפורטים ב<a href="#refunds">מדיניות ההחזרים</a>.</li></ul></div>
  </div>`;
}
