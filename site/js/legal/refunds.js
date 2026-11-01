// Refund and cancellation policy (Consumer Protection Law, 1981, sections 14ג, 14ג1, 14ה).
import { legalShell } from "./shell.js";
import { BIZ, REFUND_DAYS, REFUND_PAYOUT_DAYS } from "../business.js";

// No server yet: the cancellation "form" builds a ready email the customer copies and sends.
const CANCEL_TEMPLATE = `שלום,
אני מבקש/ת לבטל את העסקה.
שם מלא:
המייל שאיתו קניתי:
המוצר שאני מבטל/ת:
תאריך הרכישה:`;

const CANCEL_BOX = `<div class="panel" id="cancelForm"><h2>ביטול עסקה</h2>
  <p style="margin:0 0 10px">שולחים את ההודעה הזאת ל-<b>${BIZ.email}</b>. אפשר גם לכתוב במילים שלכם. תוך יום עסקים יגיע אישור עם מספר פנייה.</p>
  <textarea id="cancelText" readonly rows="6" style="width:100%;font:inherit;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink)">${CANCEL_TEMPLATE}</textarea>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-ink btn-sm" data-act="copy-cancel">להעתיק את הנוסח</button><button class="btn btn-ghost btn-sm" data-act="copy-email">להעתיק את כתובת המייל</button></div>
</div>`;

const SECTIONS = [
  { id: "r-summary", h: "בקצרה", b: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>מוצר</th><th>עד מתי מבטלים</th><th>כמה חוזר</th></tr></thead><tbody>
    <tr><td><b>קורס דיגיטלי</b></td><td>${REFUND_DAYS} יום מהרכישה</td><td>החזר מלא, בלי דמי ביטול</td></tr>
    <tr><td><b>ספר או תבנית, לפני הורדה</b></td><td>${REFUND_DAYS} יום מהרכישה</td><td>החזר מלא</td></tr>
    <tr><td><b>ספר או תבנית, אחרי הורדה</b></td><td>אין ביטול</td><td>רק אם הקובץ פגום ולא תוקן</td></tr>
    <tr><td><b>חבילה</b></td><td>לפי כל ספר בחבילה</td><td>החלק היחסי של מה שלא הורד</td></tr></tbody></table></div>
    <p style="margin-top:10px">החוק מתיר לגבות דמי ביטול של 5% מהמחיר או 100 ₪, הנמוך מביניהם. <b>אנחנו לא גובים דמי ביטול.</b></p>` },
  { id: "r-courses", h: "קורסים דיגיטליים", b: `<p>אפשר לבטל קורס בתוך ${REFUND_DAYS} יום מיום הרכישה, או מהיום שקיבלתם את מייל פרטי העסקה אם הגיע מאוחר יותר, ולקבל את כל הכסף.</p>` },
  { id: "r-books", h: "ספרים ותבניות (PDF)", b: `<p>ספר דיגיטלי הוא מידע ממוחשב, ולפי החוק אין זכות לבטל רכישה שלו אחרי שנמסר. לכן:</p>
    <ul><li><b>לפני ההורדה הראשונה:</b> ביטול בתוך ${REFUND_DAYS} יום והחזר מלא.</li><li><b>אחרי ההורדה:</b> אי אפשר לבטל.</li><li><b>קובץ פגום, חסר או לא תואם לתיאור:</b> נתקן או נחליף מיד, ואם לא הצלחנו, החזר מלא.</li></ul>
    <p>לכל ספר יש הצצה חינם בעמוד שלו, כדי שתדעו מה מקבלים לפני שקונים.</p><p class="law">סעיף 14ג(ד) לחוק הגנת הצרכן, התשמ״א-1981.</p>` },
  { id: "r-how", h: "איך מבטלים", b: `<p>בעל פה או בכתב: בנוסח שלמעלה במייל ל-${BIZ.email}, או בכל הודעה אחרת אלינו. צריך רק שם ואת המייל שאיתו קניתם. על כל ביטול נשלח אישור במייל.</p>` },
  { id: "r-money", h: "מתי הכסף חוזר", b: `<ul><li>תוך ${REFUND_PAYOUT_DAYS} יום לכל המאוחר מקבלת הודעת הביטול, לאותו אמצעי תשלום.</li><li>חברת האשראי מציגה את הזיכוי לפי מועדי החיוב שלה.</li></ul>` },
  { id: "r-extended", h: "אזרחים ותיקים, אנשים עם מוגבלות ועולים חדשים", b: `<p>אם אתם בני 65 ומעלה, אנשים עם מוגבלות או עולים חדשים (עד 5 שנים מקבלת תעודת עולה או זכאות), ובמהלך הרכישה דיברתם עם נציג שלנו, אפשר לבטל בתוך 4 חודשים. החריג לספר דיגיטלי שכבר הורד חל גם כאן.</p><p class="law">סעיף 14ג1 לחוק הגנת הצרכן.</p>` },
  { id: "r-nofee", h: "מתי אף פעם לא גובים כלום", b: `<p>אם יש פגם במוצר, הוא לא תואם לתיאור, או שלא קיבלתם אותו: ביטול בכל מקרה, החזר מלא, בלי דמי ביטול.</p>` },
  { id: "r-law", h: "החוק", b: `<ul><li>חוק הגנת הצרכן, התשמ״א-1981: סעיפים 14ג, 14ג1, 14ה</li><li>תקנות הגנת הצרכן (ביטול עסקה), התשע״א-2010</li></ul><p>אם המדיניות שלנו טובה לכם יותר מהחוק, היא זו שחלה.</p>` },
];

export const CANCEL_TEXT = CANCEL_TEMPLATE;
export const viewRefunds = () => legalShell({ title: "מדיניות החזרים", lead: "מה אפשר לבטל, עד מתי, כמה כסף חוזר ואיך עושים את זה.", sections: SECTIONS, extraTop: CANCEL_BOX });
