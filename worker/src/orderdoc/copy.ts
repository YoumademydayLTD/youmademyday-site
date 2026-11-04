// Texts of the order details document (the disclosure document the law requires), per site language.
// Names follow the legal pages: «מסמך פרטי העסקה» / "Order details document". {x} are placeholders.
export interface DocCopy {
  title: string;
  seller: string;
  company: string;
  companyNo: string;
  address: string;
  support: string;
  orderNo: string;
  date: string;
  item: string;
  price: string;
  deal: string;
  total: string;
  vatIncluded: string;
  membershipH: string;
  periodWeek: string;
  periodMonth: string;
  pricePer: string;
  freeDay: string;
  renewal: string;
  cancelHow: string;
  rightsH: string;
  rights: string;
  rightsLink: string;
  deliveryH: string;
  deliveryFiles: string;
  deliveryMembership: string;
  print: string;
  refunded: string;
}

export const DOC_COPY: Record<string, DocCopy> = {
  he: {
    title: "מסמך פרטי העסקה", seller: "המוכר", company: "שם החברה", companyNo: "מספר חברה", address: "כתובת", support: "שירות לקוחות",
    orderNo: "מספר הזמנה", date: "תאריך", item: "פריט", price: "מחיר", deal: "מבצע: 3 ספרים, הזול חינם", total: "סה״כ לתשלום", vatIncluded: "המחירים כוללים מע״מ.",
    membershipH: "פרטי המנוי", periodWeek: "חיוב שבועי", periodMonth: "חיוב חודשי", pricePer: "{price} ל{period}", freeDay: "{days} ימים ראשונים בחינם. ביטול בתוך התקופה הזאת לא יחויב בכלל.",
    renewal: "המנוי מתחדש אוטומטית בכל תקופה באותו אמצעי תשלום, עד שמבטלים.",
    cancelHow: "ביטול בכל רגע: באזור האישי באתר (מנויים ← ביטול) או בבוט בטלגרם (✨ מנויים ← ביטול). בתקופת הניסיון המנוי נגמר מיד; אחריה הוא עובד עד סוף התקופה ששולמה ולא מתחדש.",
    rightsH: "ביטול עסקה והחזרים", rights: "אפשר לבטל את העסקה בתוך {days} יום ולקבל החזר, לפי חוק הגנת הצרכן ומדיניות ההחזרים שלנו.", rightsLink: "מדיניות ההחזרים המלאה",
    deliveryH: "אספקה", deliveryFiles: "קבצים דיגיטליים (PDF): להורדה מיד אחרי התשלום בעמוד האישור, בבוט שלנו בטלגרם ובאזור האישי באתר.",
    deliveryMembership: "המנוי ניתן בבוט שלנו בטלגרם, מיד עם תחילתו.", print: "הדפסה או שמירה כ-PDF", refunded: "ההזמנה זוכתה.",
  },
  en: {
    title: "Order details document", seller: "Seller", company: "Company", companyNo: "Company number", address: "Address", support: "Customer support",
    orderNo: "Order number", date: "Date", item: "Item", price: "Price", deal: "Deal: 3 books, the cheapest free", total: "Total paid", vatIncluded: "",
    membershipH: "Membership details", periodWeek: "billed weekly", periodMonth: "billed monthly", pricePer: "{price}, {period}", freeDay: "The first {days} day(s) are free. Cancel within that time and you are never charged.",
    renewal: "The membership renews automatically each period with the same payment method until you cancel.",
    cancelHow: "Cancel any time: in your account on the site (Memberships → Cancel) or in our Telegram bot (✨ Memberships → Cancel). During the free time it ends at once; after that it runs to the end of the paid period and does not renew.",
    rightsH: "Cancellation and refunds", rights: "You may cancel this purchase within {days} days for a refund, under Israeli consumer protection law and our refund policy.", rightsLink: "Full refund policy",
    deliveryH: "Delivery", deliveryFiles: "Digital files (PDF): available to download right after payment on the confirmation page, in our Telegram bot and in your account on the site.",
    deliveryMembership: "The membership is provided in our Telegram bot from the moment it starts.", print: "Print or save as PDF", refunded: "This order was refunded.",
  },
  fr: {
    title: "Document récapitulatif de la commande", seller: "Vendeur", company: "Société", companyNo: "Numéro de société", address: "Adresse", support: "Service client",
    orderNo: "Numéro de commande", date: "Date", item: "Article", price: "Prix", deal: "Offre : 3 livres, le moins cher offert", total: "Total payé", vatIncluded: "",
    membershipH: "Détails de l’abonnement", periodWeek: "prélevé chaque semaine", periodMonth: "prélevé chaque mois", pricePer: "{price}, {period}", freeDay: "Les {days} premier(s) jour(s) sont offerts. Une résiliation pendant cette période n’entraîne aucun prélèvement.",
    renewal: "L’abonnement se renouvelle automatiquement à chaque période avec le même moyen de paiement, jusqu’à résiliation.",
    cancelHow: "Résiliation à tout moment : dans votre espace sur le site (Abonnements → Résilier) ou dans notre bot Telegram (✨ Abonnements → Annuler). Pendant la période offerte, il s’arrête tout de suite ; ensuite, il court jusqu’à la fin de la période payée sans se renouveler.",
    rightsH: "Rétractation et remboursements", rights: "Vous pouvez annuler cet achat dans un délai de {days} jours et être remboursé, selon le droit israélien de la consommation et notre politique de remboursement.", rightsLink: "Politique de remboursement complète",
    deliveryH: "Livraison", deliveryFiles: "Fichiers numériques (PDF) : à télécharger dès le paiement sur la page de confirmation, dans notre bot Telegram et dans votre espace sur le site.",
    deliveryMembership: "L’abonnement est fourni dans notre bot Telegram dès son début.", print: "Imprimer ou enregistrer en PDF", refunded: "Cette commande a été remboursée.",
  },
  ar: {
    title: "مستند تفاصيل الطلب", seller: "البائع", company: "الشركة", companyNo: "رقم الشركة", address: "العنوان", support: "خدمة العملاء",
    orderNo: "رقم الطلب", date: "التاريخ", item: "المنتج", price: "السعر", deal: "عرض: 3 كتب، والأرخص مجانًا", total: "المبلغ المدفوع", vatIncluded: "",
    membershipH: "تفاصيل الاشتراك", periodWeek: "يُخصم أسبوعيًا", periodMonth: "يُخصم شهريًا", pricePer: "{price}، {period}", freeDay: "أول {days} يوم مجانًا. الإلغاء خلال هذه المدة لا يترتب عليه أي خصم.",
    renewal: "يتجدد الاشتراك تلقائيًا كل فترة بوسيلة الدفع نفسها حتى تلغيه.",
    cancelHow: "الإلغاء في أي وقت: في حسابك على الموقع (الاشتراكات ← إلغاء) أو في بوت تيليغرام الخاص بنا (✨ الاشتراكات ← إلغاء). خلال الفترة المجانية ينتهي فورًا؛ وبعدها يستمر حتى نهاية الفترة المدفوعة ولا يتجدد.",
    rightsH: "إلغاء الصفقة والاسترداد", rights: "يمكنك إلغاء هذا الشراء خلال {days} يومًا واسترداد المبلغ، وفق قانون حماية المستهلك الإسرائيلي وسياسة الاسترداد لدينا.", rightsLink: "سياسة الاسترداد الكاملة",
    deliveryH: "التسليم", deliveryFiles: "ملفات رقمية (PDF): متاحة للتنزيل فور الدفع في صفحة التأكيد، وفي بوت تيليغرام الخاص بنا، وفي حسابك على الموقع.",
    deliveryMembership: "يُقدَّم الاشتراك في بوت تيليغرام الخاص بنا منذ بدايته.", print: "طباعة أو حفظ بصيغة PDF", refunded: "تمّ استرداد مبلغ هذا الطلب.",
  },
  ru: {
    title: "Документ с деталями заказа", seller: "Продавец", company: "Компания", companyNo: "Номер компании", address: "Адрес", support: "Служба поддержки",
    orderNo: "Номер заказа", date: "Дата", item: "Товар", price: "Цена", deal: "Акция: 3 книги, самая дешёвая бесплатно", total: "Итого оплачено", vatIncluded: "",
    membershipH: "Условия подписки", periodWeek: "списание раз в неделю", periodMonth: "списание раз в месяц", pricePer: "{price}, {period}", freeDay: "Первые дни ({days}) бесплатно. При отмене в этот срок списания не будет.",
    renewal: "Подписка продлевается автоматически каждый период тем же способом оплаты, пока вы её не отмените.",
    cancelHow: "Отменить можно в любой момент: в личном кабинете на сайте (Подписки → Отменить) или в нашем Telegram-боте (✨ Подписки → Отменить). В бесплатный период подписка заканчивается сразу; после него она действует до конца оплаченного периода и не продлевается.",
    rightsH: "Отмена покупки и возврат", rights: "Вы можете отменить эту покупку в течение {days} дней и получить возврат по израильскому закону о защите прав потребителей и нашей политике возврата.", rightsLink: "Полная политика возврата",
    deliveryH: "Получение", deliveryFiles: "Цифровые файлы (PDF): доступны для скачивания сразу после оплаты на странице подтверждения, в нашем Telegram-боте и в личном кабинете на сайте.",
    deliveryMembership: "Подписка предоставляется в нашем Telegram-боте с момента её начала.", print: "Распечатать или сохранить в PDF", refunded: "За этот заказ оформлен возврат.",
  },
};

export const RTL_LANGS = new Set(["he", "ar"]);
export const LOCALES: Record<string, string> = { he: "he-IL", en: "en-US", fr: "fr-FR", ar: "ar", ru: "ru-RU" };
