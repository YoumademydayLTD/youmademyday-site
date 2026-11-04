// The «done» streak (pure): consecutive local days with a «✓ done».
import { previousDate } from "./clock.ts";

export interface Streak { streak: number; lastDoneDate: string | null }

/** The streak after a «done» on `today`; a second tap the same day changes nothing. */
export function recordDone(current: Streak, today: string): Streak & { isNew: boolean } {
  if (current.lastDoneDate === today) return { ...current, isNew: false };
  const continues = current.lastDoneDate === previousDate(today);
  return { streak: continues ? current.streak + 1 : 1, lastDoneDate: today, isNew: true };
}
