// Coming back after a sign-in: when the visitor goes from signed out to signed in, open the page they left
// and, if they had pressed pay, carry on to the payment. Only that change counts, because the session event
// also fires on every page load (the /api/me check) and on sign-out.
import { takeIntent } from "./intent.js";
import { resumePayment } from "./pay.js";
import { isSignedIn, SESSION_EVENT } from "../telegram/session.js";

function returnTo(intent, currentRoute) {
  const carryOn = () => { if (intent.order) resumePayment(intent.order, intent.route); };
  if (currentRoute() === intent.route) { carryOn(); return; }
  // main.js added its own hashchange listener (the redraw) at start-up, so this later one runs after the
  // page is on screen and the pay button can show that it is busy.
  window.addEventListener("hashchange", carryOn, { once: true });
  location.hash = intent.route;
}

/** Call once at start-up. currentRoute: main.js's name for the page on screen. */
export function watchSignInReturn(currentRoute) {
  let wasSignedIn = isSignedIn();
  window.addEventListener(SESSION_EVENT, () => {
    const isNowSignedIn = isSignedIn();
    const hasJustSignedIn = isNowSignedIn && !wasSignedIn;
    wasSignedIn = isNowSignedIn;
    if (!hasJustSignedIn) return;
    const intent = takeIntent();
    if (intent) returnTo(intent, currentRoute);
  });
}
