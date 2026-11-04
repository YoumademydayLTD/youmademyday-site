// The signed-in visitor. Only the session token is stored, in localStorage["ymd-session"]: the cookie policy
// promises it holds no name, so the user {id, name, username, lang} lives in memory and comes from the sign-in
// reply or from /api/me. Storage can throw (private mode, blocked site data); the sign-in then lasts this visit.
import { NETWORK_FAILED, requestStart, requestWait, requestVerify, requestMe, requestLogout } from "./login-api.js";

const STORAGE_KEY = "ymd-session";
export const SESSION_EVENT = "ymd-session-change";
const WAIT_RETRY_MS = 1500;
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY = 429;
const HTTP_SERVER_ERROR = 500;

function readStored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch (error) { console.error("session: storage unreadable", error.name); return null; }
}

function writeStored(value) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, value);
  } catch (error) {
    console.error("session: storage unwritable, keeping the sign-in for this visit only", error.name);
  }
}

let session = readStored();
let user = null;

const announce = () => window.dispatchEvent(new CustomEvent(SESSION_EVENT));
const isUser = (value) => typeof value?.name === "string";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isSignedIn = () => session !== null;
/** The signed-in user, or null while unknown (not signed in, or /api/me has not answered yet). */
export const getUser = () => user;

function signIn(data) {
  if (typeof data.session !== "string") return false;
  session = data.session;
  user = isUser(data.user) ? data.user : null;
  writeStored(session);
  announce();
  return true;
}

function signOutLocally() {
  session = null;
  user = null;
  writeStored(null);
  announce();
}

/** A fresh login ticket: { status: "ok", token, deepLink, expiresAt (unix s) } or { status: "network" }. */
export async function startLogin() {
  const { status, data } = await requestStart();
  const isTicket = typeof data.token === "string" && typeof data.deepLink === "string" && typeof data.expiresAt === "number";
  return status === HTTP_OK && isTicket ? { status: "ok", token: data.token, deepLink: data.deepLink, expiresAt: data.expiresAt } : { status: "network" };
}

/**
 * Long-polls until the visitor confirms in the bot. Resolves { status: "ok" | "expired" | "stopped" }.
 * Network errors are retried: iOS suspends the page while Telegram is open, so the first request after
 * coming back often fails. signalFor() lets the page cut a stuck request short when it becomes visible again.
 */
export async function waitLogin({ token, expiresAt, isActive, signalFor = () => undefined, now = Date.now }) {
  while (isActive()) {
    if (now() >= expiresAt * 1000) return { status: "expired" };
    const { status, data } = await requestWait(token, signalFor());
    if (!isActive()) return { status: "stopped" };
    if (status === HTTP_OK && data.status === "ok" && signIn(data)) return { status: "ok" };
    if (status === HTTP_OK && data.status === "expired") return { status: "expired" };
    // Any other client error means this token is no good any more: a new link is the way out.
    if (status !== HTTP_OK && status !== NETWORK_FAILED && status < HTTP_SERVER_ERROR) return { status: "expired" };
    if (status !== HTTP_OK || data.status !== "pending") await sleep(WAIT_RETRY_MS);
  }
  return { status: "stopped" };
}

/** Signs in with the 6-digit code from /login in the bot: { status: "ok" | "wrong" | "limited" | "network" }. */
export async function verifyCode(code) {
  const { status, data } = await requestVerify(code);
  if (status === HTTP_OK && data.status === "ok" && signIn(data)) return { status: "ok" };
  if (status === HTTP_UNAUTHORIZED) return { status: "wrong" };
  if (status === HTTP_TOO_MANY) return { status: "limited" };
  return { status: "network" };
}

/** Checks the stored session once per page load: fills the user, or forgets a session the server refuses. */
export async function fetchMe() {
  if (!isSignedIn()) return;
  const { status, data } = await requestMe(session);
  if (status === HTTP_UNAUTHORIZED) { signOutLocally(); return; }
  if (status === HTTP_OK && isUser(data.user)) { user = data.user; announce(); return; }
  console.error("session: could not check the sign-in, keeping it", status);
}

/** Signs out here at once, then tells the server; a failed call still leaves this browser signed out. */
export async function logout() {
  const current = session;
  signOutLocally();
  if (current === null) return;
  const { status } = await requestLogout(current);
  if (status !== HTTP_OK) console.error("session: the server did not confirm the sign-out", status);
}
