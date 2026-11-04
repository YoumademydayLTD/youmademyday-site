// Time units, so durations read as words instead of bare numbers.
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export const unixSeconds = (date: Date): number => Math.floor(date.getTime() / MS_PER_SECOND);
