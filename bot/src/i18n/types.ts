// Every text the bot sends, per language. {name} placeholders are filled by t(). Each language file must have
// every key (the type checks it), so a customer never sees a missing string.
export interface Copy {
  welcome: string;
  menuPrompt: string;
  menuLibrary: string;
  menuPlans: string;
  menuReminders: string;
  menuSupport: string;
  menuSettings: string;
  back: string;
  unknown: string;
  error: string;
  saved: string;
  on: string;
  off: string;

  loginCode: string;
  loginAsk: string;
  loginConfirm: string;
  loginDone: string;
  loginExpired: string;
  toSite: string;

  orderThanks: string;
  orderPending: string;
  orderNotFound: string;
  orderOtherUser: string;
  orderRefunded: string;
  orderLinks: string;
  downloadButton: string;

  libraryHead: string;
  libraryEmpty: string;
  toShop: string;

  plansText: string;
  plansButton: string;
  planOnSite: string;
  planButton: string;
  sparkJoined: string;
  sparkAlready: string;

  btnDone: string;
  btnLater: string;
  btnLesson: string;
  doneFirst: string;
  doneStreak: string;
  doneAgain: string;
  eveningSet: string;
  eveningLead: string;

  btnJoinSpark: string;
  dailyNone: string;
  remindersText: string;
  stateOn: string;
  statePaused: string;
  stateSilent: string;
  pickHour: string;
  pickZone: string;
  btnHour: string;
  btnZone: string;
  btnPause: string;
  btnResume: string;
  btnSilent: string;
  btnSound: string;
  zones: Record<string, string>;

  settingsText: string;
  btnLang: string;
  btnNews: string;
  btnTerms: string;
  btnPrivacy: string;
  btnDelete: string;
  pickLang: string;

  termsText: string;
  privacyText: string;

  deleteAsk: string;
  deleteYes: string;
  deleteNo: string;
  deleteDone: string;
  deleteKept: string;

  supportOpen: string;
  supportAck: string;

  planNames: Record<string, string>;
  chargeReminder: string;
  subsTitle: string;
  subActive: string;
  subTrial: string;
  subEnding: string;
  subCancelButton: string;
  subCancelAskTrial: string;
  subCancelAskPaid: string;
  subCancelYes: string;
  subCancelNo: string;
  subCanceledNow: string;
  subCanceledEnd: string;
  subCancelFailed: string;
}

/** The bot's profile in one language (setMyName / setMyDescription / setMyShortDescription / setMyCommands). */
export interface Profile {
  name: string;
  description: string; // ≤ 512 characters, shown in an empty chat
  shortDescription: string; // ≤ 120 characters, shown on the profile and with shared links
  commands: Record<"start" | "library" | "plans" | "reminders" | "support" | "login" | "settings" | "terms" | "privacy" | "delete", string>;
}
