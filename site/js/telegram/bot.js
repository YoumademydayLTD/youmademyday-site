// The store's Telegram bot (@youmademydaystore_bot, live since 04.11.2026). Every Telegram button on the
// site opens it; isBotLive() stays so the site can fall back to the login page if the name is ever cleared.
export const BOT_USERNAME = "youmademydaystore_bot";

export const isBotLive = () => BOT_USERNAME !== "";

/** Deep link that opens the bot with a start payload (login token, plan id, support). */
export const botUrl = (payload = "") =>
  isBotLive() ? `https://t.me/${BOT_USERNAME}${payload ? `?start=${encodeURIComponent(payload)}` : ""}` : "#login";
