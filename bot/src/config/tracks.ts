// Daily-message tracks. Spark is the free channel; the topic tracks need an active membership of one of the
// listed plans (the store worker writes the subscriptions; until plans are live nobody has one). Ids match
// site/js/telegram/plans.js.
export interface Track { id: string; plans: readonly string[] }

const MEMBER_PLANS = ["grow", "max", "day", "community", "mentor"] as const;

export const TRACKS: readonly Track[] = [
  { id: "spark", plans: [] },
  { id: "confidence", plans: MEMBER_PLANS },
  { id: "couples", plans: MEMBER_PLANS },
  { id: "habits", plans: MEMBER_PLANS },
  { id: "money", plans: MEMBER_PLANS },
  { id: "calm", plans: MEMBER_PLANS },
  { id: "goals", plans: MEMBER_PLANS },
];
export const FREE_TRACK = "spark";

export const findTrack = (id: string): Track | undefined => TRACKS.find((t) => t.id === id);
export const isFreeTrack = (track: Track): boolean => track.plans.length === 0;

/** Whether a user with these active plan ids may receive a track. */
export function canReceive(track: Track, activePlans: readonly string[]): boolean {
  return isFreeTrack(track) || track.plans.some((plan) => activePlans.includes(plan));
}
