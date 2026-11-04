// The store's Telegram bot. Empty until the owner creates it with @BotFather; until then every
// Telegram button leads to the login page, which says the bot opens soon.
export const BOT_USERNAME = "";

export const isBotLive = () => BOT_USERNAME !== "";

/** Deep link that opens the bot with a start payload (login token, plan id, support). */
export const botUrl = (payload = "") =>
  isBotLive() ? `https://t.me/${BOT_USERNAME}${payload ? `?start=${encodeURIComponent(payload)}` : ""}` : "#login";
