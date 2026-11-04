// The bot's command list per language (pure; also used by tools/setup_telegram.ts).
import type { Lang } from "../config/langs.ts";
import { PROFILES } from "../i18n/index.ts";
import type { Profile } from "../i18n/types.ts";

export const COMMAND_ORDER: readonly (keyof Profile["commands"])[] = ["start", "library", "plans", "reminders", "support", "login", "settings", "terms", "privacy", "delete"];

export const commandsFor = (lang: Lang) => COMMAND_ORDER.map((command) => ({ command, description: PROFILES[lang].commands[command] }));
