// The reader's calls to the payment worker. Each needs the Telegram session (sent by callStore) and an item
// the visitor owns or has through a membership; the worker answers 403 not_entitled otherwise.
import { callStore } from "../checkout/request.js";
import { itemOf, unitOf, doneStateOf } from "./reply.js";

const pathOf = (id, n) => `/api/read/${encodeURIComponent(id)}${n === undefined ? "" : `/${n}`}`;

/** The item with its list of lessons or chapters. */
export const fetchReadItem = async (id) => itemOf(await callStore(pathOf(id)));

/** One lesson or chapter, with its body HTML (already sanitized by the worker). */
export const fetchReadUnit = async (id, n) => unitOf(await callStore(pathOf(id, n)));

/** Marks a unit done or not done; resolves to the item's new progress. */
export const saveUnitDone = async (id, n, done) => doneStateOf(await callStore(`${pathOf(id, n)}/done`, { method: "POST", body: { done } }));
