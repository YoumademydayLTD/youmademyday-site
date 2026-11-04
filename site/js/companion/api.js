// The daily companion's calls to the bot worker, as the signed-in visitor (the session goes along, as for /api/me).
// It is the same companion as in the bot: the same message, the same streak, the same settings.
import { callBot } from "../checkout/request.js";
import { companionOf, settingsReplyOf, doneReplyOf } from "./reply.js";

export const fetchCompanion = async () => companionOf(await callBot("/api/companion"));

/** «✓ Done» for today, the same as the bot's button; resolves to { streak, doneToday }. */
export const markCompanionDone = async () => doneReplyOf(await callBot("/api/companion/done", { method: "POST", body: {} }));

/** Saves some of { dailyHour, paused, silent }; resolves to all the settings as saved. */
export const saveCompanionSettings = async (patch) => settingsReplyOf(await callBot("/api/companion/settings", { method: "POST", body: patch }));

/** Joins a track; resolves to the whole companion. Refused with "forbidden" when the track needs a membership. */
export const joinCompanionTrack = async (track) => companionOf(await callBot("/api/companion/track", { method: "POST", body: { track } }));
