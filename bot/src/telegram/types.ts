// The parts of the Telegram Bot API objects the bot reads (https://core.telegram.org/bots/api).
export interface TgUser { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string; language_code?: string }
export interface TgChat { id: number; type: "private" | "group" | "supergroup" | "channel" }
export interface TgPhotoSize { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }
export interface TgFile { file_id: string; file_unique_id?: string; file_name?: string; mime_type?: string; file_size?: number }

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: TgFile;
  voice?: TgFile;
  video?: TgFile;
  sticker?: TgFile & { emoji?: string };
  reply_to_message?: TgMessage;
}

export interface TgCallbackQuery { id: string; from: TgUser; message?: TgMessage; data?: string }

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
  my_chat_member?: { chat: TgChat; from: TgUser; new_chat_member: { status: string } };
}

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };
export interface InlineKeyboard { inline_keyboard: InlineButton[][] }
