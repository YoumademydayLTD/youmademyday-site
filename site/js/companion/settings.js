// The daily companion's settings: the reminder hour, a pause and silent messages. The same settings as in the
// bot. Each control saves on its own as soon as it changes, and goes back to the saved value when that fails.
import { BIZ } from "../business.js";
import { esc } from "../util.js";
import { t, L } from "../i18n/index.js";
import { HOURS_PER_DAY, formatHour } from "./reply.js";
import { saveCompanionSettings } from "./api.js";

const STATUS_ID = "compSetStatus";

// What each control (data-change) sets, and how its value is read and put back.
const FIELDS = {
  "comp-hour": { key: "dailyHour", read: (el) => Number(el.value), write: (el, v) => { el.value = String(v); } },
  "comp-paused": { key: "paused", read: (el) => el.checked, write: (el, v) => { el.checked = v; } },
  "comp-silent": { key: "silent", read: (el) => el.checked, write: (el, v) => { el.checked = v; } },
};

function hourSelect(selected) {
  const options = Array.from({ length: HOURS_PER_DAY }, (_, h) => `<option value="${h}"${h === selected ? " selected" : ""}>${formatHour(h, L.locale)}</option>`);
  return `<select id="compHour" data-change="comp-hour">${options.join("")}</select>`;
}

const toggle = (id, change, isOn, label, hint) => `<label class="comp-switch" for="${id}">
    <input type="checkbox" role="switch" id="${id}" data-change="${change}"${isOn ? " checked" : ""}>
    <span><b>${label}</b><small class="muted">${hint}</small></span></label>`;

export function settingsBlock(settings) {
  const zone = settings.timeZone ? `<small class="muted">${t("comp.timeZone", { zone: esc(settings.timeZone) })}</small>` : "";
  return `<section class="comp-settings" aria-labelledby="compSetH"><h3 id="compSetH">${t("comp.settingsH")}</h3>
      <div class="field"><label for="compHour">${t("comp.hour")}</label>${hourSelect(settings.dailyHour)}${zone}</div>
      ${toggle("compPaused", "comp-paused", settings.paused, t("comp.pause"), t("comp.pauseHint"))}
      ${toggle("compSilent", "comp-silent", settings.silent, t("comp.silent"), t("comp.silentHint"))}
      <p class="login-status" id="${STATUS_ID}" role="status" aria-live="polite"></p></section>`;
}

const say = (html) => { const el = document.getElementById(STATUS_ID); if (el) el.innerHTML = html; };

/**
 * Saves the setting a control changed. getSettings/setSettings read and replace the one copy of the settings;
 * onLoginRequired(error) handles an expired session and returns true when it did.
 */
export async function saveSetting(el, { getSettings, setSettings, onLoginRequired }) {
  const field = FIELDS[el.dataset.change];
  if (!field) return;
  const before = getSettings()[field.key];
  say(t("comp.saving"));
  try {
    setSettings(await saveCompanionSettings({ [field.key]: field.read(el) }));
    say(t("comp.saved"));
  } catch (error) {
    if (onLoginRequired(error)) return;
    console.error("companion: could not save a setting", error);
    field.write(el, before);
    say(t("comp.saveError", { email: `<b>${BIZ.email}</b>` }));
  }
}

export const SETTING_CHANGES = Object.keys(FIELDS);
