// Daily-message tracks. Spark is the free channel; the topic tracks need an active membership of one of the
// listed plans (the store worker writes the subscriptions; until plans are live nobody has one). Ids match
// site/js/telegram/plans.js.
export interface Track { id: string; plans: readonly string[] }

// "library" is the weekly link plan that opens everything (owner, 12.11.2026; site/js/telegram/link-plans.js).
const MEMBER_PLANS = ["grow", "max", "day", "community", "mentor", "library"] as const;
// Owner, 12.11.2026: three weekly link plans are one topic track each (the plan id is the track id), so each
// opens its own track and no other.
const withOwnPlan = (trackId: string): readonly string[] => [...MEMBER_PLANS, trackId];

export const TRACKS: readonly Track[] = [
  { id: "spark", plans: [] },
  { id: "confidence", plans: withOwnPlan("confidence") },
  { id: "couples", plans: MEMBER_PLANS },
  { id: "habits", plans: MEMBER_PLANS },
  { id: "money", plans: MEMBER_PLANS },
  { id: "calm", plans: withOwnPlan("calm") },
  { id: "goals", plans: withOwnPlan("goals") },
];
export const FREE_TRACK = "spark";

export const findTrack = (id: string): Track | undefined => TRACKS.find((t) => t.id === id);
export const isFreeTrack = (track: Track): boolean => track.plans.length === 0;

/** Whether a user with these active plan ids may receive a track. */
export function canReceive(track: Track, activePlans: readonly string[]): boolean {
  return isFreeTrack(track) || track.plans.some((plan) => activePlans.includes(plan));
}
