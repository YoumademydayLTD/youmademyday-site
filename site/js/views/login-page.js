// Brings the login page to life once it is on screen: the phone link with a fresh login token and the
// wait for «confirm» in the bot, and the 6-digit code form for computers. A successful sign-in changes the
// session, and main.js redraws the page into its signed-in state.
import { t } from "../i18n/index.js";
import { $, toast } from "../util.js";
import { isBotLive } from "../telegram/bot.js";
import { isSignedIn, startLogin, waitLogin, verifyCode } from "../telegram/session.js";
import { CODE_LENGTH, digitsOf } from "../telegram/code-digits.js";

const CODE_ERRORS = { wrong: "login.errWrong", limited: "login.errLimited", network: "login.errNetwork" };

const say = (el, key, isError = false) => {
  el.textContent = key ? t(key) : "";
  el.classList.toggle("err", isError);
};

function mountPhone(isActive) {
  const link = $("#loginLink");
  const status = $("#phoneStatus");
  let ticket = null;
  let isWaiting = false;
  let refreshTimer;
  let wake = new AbortController();

  const setReady = (isReady) => {
    if (isReady) { link.href = ticket.deepLink; link.target = "_blank"; link.rel = "noopener"; link.removeAttribute("aria-disabled"); return; }
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  };

  async function newLink() {
    clearTimeout(refreshTimer);
    ticket = null;
    setReady(false);
    const result = await startLogin();
    if (!isActive()) return;
    if (result.status !== "ok") { say(status, "login.errNetwork", true); return; }
    ticket = result;
    setReady(true);
    // An unused link is replaced as it runs out, so a tap never opens a dead one.
    refreshTimer = setTimeout(() => { if (isActive() && !isWaiting) newLink(); }, Math.max(0, ticket.expiresAt * 1000 - Date.now()));
  }

  async function wait() {
    if (isWaiting) return;
    isWaiting = true;
    say(status, "login.waiting");
    const result = await waitLogin({ token: ticket.token, expiresAt: ticket.expiresAt, isActive, signalFor: () => wake.signal });
    isWaiting = false;
    if (result.status === "ok") toast(t("login.welcome"));
    if (result.status === "expired" && isActive()) { say(status, "login.expired"); newLink(); }
  }

  link.addEventListener("click", (e) => {
    // No link yet (still preparing, or the network failed): the tap asks for one instead.
    if (!ticket) { e.preventDefault(); say(status, ""); newLink(); return; }
    wait();
  });
  // Back from Telegram: cut the request iOS froze while the page was hidden, so the answer comes at once.
  const onVisible = () => {
    if (!isActive()) { document.removeEventListener("visibilitychange", onVisible); return; }
    if (document.visibilityState !== "visible" || !isWaiting) return;
    wake.abort();
    wake = new AbortController();
  };
  document.addEventListener("visibilitychange", onVisible);
  newLink();
}

function fillFrom(cells, start, digits) {
  const chars = digits.slice(0, CODE_LENGTH - start);
  [...chars].forEach((d, k) => { cells[start + k].value = d; });
  cells[Math.min(start + chars.length, CODE_LENGTH - 1)].focus();
}

function wireCells(cells) {
  cells.forEach((cell, i) => {
    cell.addEventListener("input", () => {
      const digits = digitsOf(cell.value);
      // A whole code arrives at once from iOS autofill or a phone keyboard's paste.
      if (digits.length === CODE_LENGTH) { fillFrom(cells, 0, digits); return; }
      cell.value = digits.slice(-1);
      if (cell.value && i < CODE_LENGTH - 1) cells[i + 1].focus();
    });
    cell.addEventListener("paste", (e) => {
      const digits = digitsOf(e.clipboardData?.getData("text") ?? "");
      if (!digits) return;
      e.preventDefault();
      fillFrom(cells, digits.length >= CODE_LENGTH ? 0 : i, digits);
    });
    cell.addEventListener("keydown", (e) => {
      if (e.key !== "Backspace" || cell.value || i === 0) return;
      e.preventDefault();
      cells[i - 1].value = "";
      cells[i - 1].focus();
    });
  });
}

function mountCode(isActive) {
  const form = $("#codeForm");
  const cells = [...form.querySelectorAll(".code input")];
  const button = form.querySelector("button");
  const status = $("#codeStatus");
  wireCells(cells);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = cells.map((c) => c.value).join("");
    if (code.length !== CODE_LENGTH) { say(status, "login.errShort", true); cells.find((c) => !c.value)?.focus(); return; }
    button.disabled = true;
    say(status, "login.checking");
    const result = await verifyCode(code);
    // Success redraws the page into its signed-in state, so the welcome comes before the isActive check.
    if (result.status === "ok") { toast(t("login.welcome")); return; }
    if (!isActive()) return;
    button.disabled = false;
    say(status, CODE_ERRORS[result.status], true);
    if (result.status === "wrong") { cells.forEach((c) => { c.value = ""; }); cells[0].focus(); }
  });
}

/** Called after the login page is on screen. Nothing to do when signed in or while the bot is not live. */
export function mountLogin() {
  if (!isBotLive() || isSignedIn()) return;
  const root = $("#loginRoot");
  const isActive = () => root.isConnected;
  mountPhone(isActive);
  mountCode(isActive);
}
