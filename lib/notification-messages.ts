/**
 * The marketplace's notifications, in each language the app speaks.
 *
 * A notification is stored with its English title and message - what any screen that
 * doesn't translate shows - plus the template id and the values filled into it, so the
 * reader's own screen can show it in their language (localizeNotification). Notifications from before this, or from outside the
 * marketplace, carry no id and show as stored.
 *
 * Placeholders are {name}. Titles and names the seller typed stay as typed.
 */

/**
 * A value filled into a placeholder. `keys` are translation keys (e.g. the labels of the
 * fields a seller changed) that the reader's screen translates; `text` is what the
 * stored English shows instead.
 */
export type NotificationParam = string | number | { keys: string[]; text: string }
export type NotificationParams = Record<string, NotificationParam>

interface Template {
  title: string
  message: string
}

const en = {
  "requestNew.animal": { title: "New listing request", message: '{seller} submitted "{title}" for review.' },
  "requestNew.drug": { title: "New drug listing request", message: '{seller} submitted "{title}" for review.' },
  "requestNew.feed": { title: "New feed listing request", message: '{seller} submitted "{title}" for review.' },
  "requestPublished.animal": {
    title: "Your animal is now listed",
    message: '"{title}" is live on the marketplace. Buyers who want it will be put in touch with you through Vettrack.',
  },
  "requestPublished.drug": { title: "Your drug is now listed", message: '"{title}" is live on the pharmacy page.' },
  "requestPublished.feed": { title: "Your feed is now listed", message: '"{title}" is live on the feeds page.' },
  requestRejected: {
    title: "Your listing request was not approved",
    message: '"{title}" was not published. {note} You can update it and send it again.',
  },
  requestResubmitted: {
    title: "Listing request resubmitted",
    message: '{seller} revised "{title}" and sent it back for review.',
  },
  removalRequested: {
    title: "Listing removal requested",
    message: '{seller} asked to remove "{title}" from the marketplace.',
  },
  removalApproved: {
    title: "Your listing was removed",
    message: '"{title}" was taken off the marketplace, as you asked.',
  },
  removalDeclined: {
    title: "Your removal request was declined",
    message: '"{title}" stays on the marketplace. {note}',
  },
  listingEdited: {
    title: "Listing edited by the seller",
    message: '{seller} edited "{title}". Changed: {fields}.',
  },
  listingHidden: {
    title: "Your listing was hidden",
    message: '"{name}" was hidden from the marketplace. {reason}',
  },
  listingShown: {
    title: "Your listing is visible again",
    message: '"{name}" is back on the marketplace.',
  },
  listingDeleted: {
    title: "Your listing was removed",
    message: '"{name}" was removed from the marketplace by Vettrack.',
  },
  orderStockShort: {
    title: "Order paid for more stock than was left",
    message:
      "Order {ref} was paid for, but not enough of {items} was left in stock. Check with the seller, or refund the buyer from Refunds.",
  },
  newSale: {
    title: "New sale",
    message:
      "Order {ref}: {items} for {buyer}. Vettrack collected RWF {amount}; your share is RWF {share}. " +
      "Open Sales for the buyer's contact and delivery details.",
  },
  newSaleShort: {
    title: "New sale",
    message:
      "Order {ref}: {items} for {buyer}. Vettrack collected RWF {amount}; your share is RWF {share}. " +
      "Open Sales for the buyer's contact and delivery details. " +
      "Your stock was short for part of this order - Vettrack will contact you.",
  },
  refundRequested: {
    title: "Refund requested",
    message: "{requester} asked to refund RWF {amount} on order {ref} ({items}).",
  },
  refundClawback: {
    title: "Refund after the seller was paid",
    message:
      "Refund on order {ref} covers items the seller had already been paid for. They owe RWF {amount} back.",
  },
  refundPaid: {
    title: "Refund paid to the buyer",
    message: "Order {ref}: {items} refunded to the buyer. Your share of RWF {share} is no longer due.",
  },
  refundPaidClawback: {
    title: "Refund paid to the buyer",
    message:
      "Order {ref}: {items} refunded to the buyer. " +
      "You had already been paid RWF {amount} for them - Vettrack will contact you to settle it.",
  },
  refundDeclined: {
    title: "Refund request declined",
    message: "Your refund request on order {ref} was declined. {note}",
  },
  lowStock: {
    title: "Stock running low",
    message: 'Only {count} of "{name}" left. Update the stock when you restock so it stays on sale.',
  },
  outOfStock: {
    title: "Out of stock",
    message: '"{name}" sold out and is no longer shown to buyers. Update its stock to show it again.',
  },
  expiredOffSale: {
    title: "Off sale: expiry date",
    message:
      '"{name}" expires on {date}, so buyers can no longer order it. Update the listing when you restock with a newer batch.',
  },
  expiresSoon: {
    title: "Expires soon",
    message: '"{name}" expires on {date}. Buyers can order it until {lastDay}.',
  },
} satisfies Record<string, Template>

export type NotificationId = keyof typeof en

// Each sentence names what it is about (itangazo, umuti, igicuruzwa...) before the
// quoted title, so the verb has a noun to agree with whatever the seller called it.
const rw: Record<NotificationId, Template> = {
  "requestNew.animal": {
    title: "Icyifuzo gishya cyo gutangaza itungo",
    message: '{seller} yohereje itangazo "{title}" ngo risuzumwe.',
  },
  "requestNew.drug": {
    title: "Icyifuzo gishya cyo gutangaza umuti",
    message: '{seller} yohereje umuti "{title}" ngo usuzumwe.',
  },
  "requestNew.feed": {
    title: "Icyifuzo gishya cyo gutangaza ibiryo by'amatungo",
    message: '{seller} yohereje ibiryo "{title}" ngo bisuzumwe.',
  },
  "requestPublished.animal": {
    title: "Itungo ryawe ryatangajwe",
    message: 'Itangazo "{title}" ubu riri ku isoko. Abaguzi baryifuza bazahuzwa nawe binyuze kuri Vettrack.',
  },
  "requestPublished.drug": {
    title: "Umuti wawe watangajwe",
    message: "Umuti \"{title}\" ubu uri ku rupapuro rw'imiti.",
  },
  "requestPublished.feed": {
    title: "Ibiryo byawe byatangajwe",
    message: "Ibiryo \"{title}\" ubu biri ku rupapuro rw'ibiryo by'amatungo.",
  },
  requestRejected: {
    title: "Icyifuzo cyawe nticyemewe",
    message: 'Itangazo "{title}" ntiryatangajwe. {note} Ushobora kurihindura ukongera kurohereza.',
  },
  requestResubmitted: {
    title: "Icyifuzo cyongeye koherezwa",
    message: '{seller} yahinduye itangazo "{title}" yongera kurohereza ngo risuzumwe.',
  },
  removalRequested: {
    title: "Gusaba gukuraho itangazo",
    message: '{seller} yasabye ko itangazo "{title}" rikurwa ku isoko.',
  },
  removalApproved: {
    title: "Itangazo ryawe ryakuweho",
    message: "Itangazo \"{title}\" ryakuwe ku isoko, nk'uko wabisabye.",
  },
  removalDeclined: {
    title: "Icyifuzo cyawe cyo gukuraho itangazo nticyemewe",
    message: 'Itangazo "{title}" rizaguma ku isoko. {note}',
  },
  listingEdited: {
    title: "Itangazo ryahinduwe n'umugurisha",
    message: '{seller} yahinduye itangazo "{title}". Ibyahinduwe: {fields}.',
  },
  listingHidden: {
    title: "Itangazo ryawe ryahishwe",
    message: 'Itangazo "{name}" ryahishwe ku isoko. {reason}',
  },
  listingShown: {
    title: "Itangazo ryawe ryongeye kugaragara",
    message: 'Itangazo "{name}" ryongeye kugaragara ku isoko.',
  },
  listingDeleted: {
    title: "Itangazo ryawe ryakuweho",
    message: 'Itangazo "{name}" ryakuwe ku isoko na Vettrack.',
  },
  orderStockShort: {
    title: "Itumiza ryishyuwe ububiko budahagije",
    message:
      "Itumiza {ref} ryarishyuwe, ariko {items} ntibyari bihagije mu bubiko. " +
      "Vugana n'umugurisha, cyangwa usubize umuguzi amafaranga muri Gusubiza amafaranga.",
  },
  newSale: {
    title: "Igurisha rishya",
    message:
      "Itumiza {ref}: {items} byaguzwe na {buyer}. Vettrack yakiriye RWF {amount}; umugabane wawe ni RWF {share}. " +
      "Fungura Ibyagurishijwe urebe uko wavugana n'umuguzi n'aho kubimugereza.",
  },
  newSaleShort: {
    title: "Igurisha rishya",
    message:
      "Itumiza {ref}: {items} byaguzwe na {buyer}. Vettrack yakiriye RWF {amount}; umugabane wawe ni RWF {share}. " +
      "Fungura Ibyagurishijwe urebe uko wavugana n'umuguzi n'aho kubimugereza. " +
      "Ububiko bwawe ntibwari buhagije ku gice cy'iri tumiza - Vettrack izakuvugisha.",
  },
  refundRequested: {
    title: "Gusubiza amafaranga byasabwe",
    message: "{requester} yasabye gusubiza RWF {amount} ku itumiza {ref} ({items}).",
  },
  refundClawback: {
    title: "Amafaranga yasubijwe nyuma y'uko umugurisha yishyuwe",
    message:
      "Amafaranga yasubijwe ku itumiza {ref} arimo ibyo umugurisha yari yarishyuwe. Agomba kugarura RWF {amount}.",
  },
  refundPaid: {
    title: "Umuguzi yasubijwe amafaranga",
    message: "Itumiza {ref}: umuguzi yasubijwe amafaranga ya {items}. Ntuzongera kwishyurwa umugabane wawe wa RWF {share}.",
  },
  refundPaidClawback: {
    title: "Umuguzi yasubijwe amafaranga",
    message:
      "Itumiza {ref}: umuguzi yasubijwe amafaranga ya {items}. " +
      "Wari waramaze kwishyurwa RWF {amount} kuri byo - Vettrack izakuvugisha kugira ngo bikemuke.",
  },
  refundDeclined: {
    title: "Icyifuzo cyo gusubiza amafaranga nticyemewe",
    message: "Icyifuzo cyawe cyo gusubiza amafaranga ku itumiza {ref} nticyemewe. {note}",
  },
  lowStock: {
    title: "Ububiko bugiye gushira",
    message:
      'Hasigaye {count} gusa by\'igicuruzwa "{name}". Vugurura ububiko nibimara kongerwa kugira ngo gikomeze kugurishwa.',
  },
  outOfStock: {
    title: "Byashize mu bubiko",
    message:
      'Igicuruzwa "{name}" cyashize kandi ntikikigaragara ku baguzi. Vugurura ububiko bwacyo kugira ngo cyongere kigaragare.',
  },
  expiredOffSale: {
    title: "Ntikigurishwa: kirarangiye",
    message:
      'Igicuruzwa "{name}" kirangira ku wa {date}, bityo abaguzi ntibagishobora kugitumiza. ' +
      "Hindura itangazo nuzana icyiciro (batch) gishya.",
  },
  expiresSoon: {
    title: "Kirarangira vuba",
    message: 'Igicuruzwa "{name}" kirangira ku wa {date}. Abaguzi bashobora kugitumiza kugeza ku wa {lastDay}.',
  },
}

const TEMPLATES: Record<string, Record<NotificationId, Template>> = { en, rw }

/** What a notification stores so a screen can show it in another language. */
export interface NotificationI18n {
  id: NotificationId
  params: NotificationParams
}

/** A notification's stored English, with what it takes to show it in another language. */
export interface NotificationText {
  title: string
  message: string
  i18n: NotificationI18n
}

function fill(template: string, params: NotificationParams, translate?: (key: string) => string): string {
  return template
    .replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name]
      if (value === undefined || value === null) return match
      if (typeof value === "object") {
        // Read back from the database, so don't trust the shape.
        return translate && Array.isArray(value.keys) ? value.keys.map((key) => translate(String(key))).join(", ") : String(value.text ?? "")
      }
      return String(value)
    })
    .trim()
}

/** The title and message to store for a notification, in English, plus its id and values. */
export function notificationText(id: NotificationId, params: NotificationParams = {}): NotificationText {
  return { title: fill(en[id].title, params), message: fill(en[id].message, params), i18n: { id, params } }
}

/**
 * A stored notification's title and message in `language`. One without a known template
 * - older, from outside the marketplace, or in a language with no templates - keeps its
 * stored text.
 */
export function localizeNotification<T extends { title: string; message: string; i18n?: unknown }>(
  notification: T,
  language: string,
  t: (key: string) => string
): T {
  const i18n = notification.i18n as Partial<NotificationI18n> | null | undefined
  const templates = TEMPLATES[language]
  if (!i18n || typeof i18n.id !== "string" || !templates || !Object.prototype.hasOwnProperty.call(templates, i18n.id)) {
    return notification
  }
  const template = templates[i18n.id as NotificationId]
  const params = i18n.params && typeof i18n.params === "object" ? i18n.params : {}
  return { ...notification, title: fill(template.title, params, t), message: fill(template.message, params, t) }
}
