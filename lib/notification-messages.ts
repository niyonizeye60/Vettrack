/**
 * The notifications the app sends, in each language it speaks.
 *
 * A notification is stored with its English title and message - what any screen that
 * doesn't translate shows - plus the template id and the values filled into it, so the
 * reader's own screen can show it in their language (localizeNotification).
 * Notifications from before this, and ones staff write themselves, carry no id and show
 * as stored.
 *
 * Placeholders are {name}. Names, titles and messages people typed stay as typed.
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

  // Accounts, security and the platform (to superadmin)
  privilegedAccount: { title: "Privileged account created", message: "A new {role} account was created for {email}." },
  accountLockedOut: {
    title: "Account locked out",
    message: "{email} was locked out after {count} failed login attempts.",
  },
  cronFailed: { title: "Scheduled job failed", message: "{job} failed to run: {error}" },
  highRegistrations: {
    title: "High User Registration Activity",
    message: "{count} new users registered in the last 24 hours",
  },
  highPendingConsultations: { title: "High Pending Consultations", message: "{count} consultations are pending review" },
  failedLoginSpike: { title: "Security Alert", message: "{count} failed login attempts detected in the last 24 hours" },
  highPendingListings: {
    title: "High Pending Listing Requests",
    message: "{count} marketplace listing requests are pending review",
  },
  paymentFailureSpike: { title: "Payment Failure Spike", message: "{count} order payments failed in the last 24 hours" },

  // The herd (to farmers)
  "calving.14": { title: "Upcoming calving", message: "{animal} is expected to calve in about 2 weeks." },
  "calving.7": { title: "Upcoming calving", message: "{animal} is expected to calve in about 1 week." },
  "calvingUnnamed.14": { title: "Upcoming calving", message: "Your cow is expected to calve in about 2 weeks." },
  "calvingUnnamed.7": { title: "Upcoming calving", message: "Your cow is expected to calve in about 1 week." },
  calfReady: {
    title: "Calf ready to move to your animals",
    message: "{names} is now {months} months old. Open Calves and use Move to Animals to add it to your herd.",
  },
  calvesReady: {
    title: "Calves ready to move to your animals",
    message: "{names} are now {months} months or older. Open Calves and use Move to Animals to add them to your herd.",
  },
  calvesReadyMore: {
    title: "Calves ready to move to your animals",
    message:
      "{names} and {more} more are now {months} months or older. Open Calves and use Move to Animals to add them to your herd.",
  },

  // Consultations
  consultationRequested: { title: "New consultation request", message: "{farmer} requested a consultation." },
  consultationRequestedAnimal: { title: "New consultation request", message: "{farmer} requested a consultation for {animal}." },
  appointmentScheduled: { title: "Appointment scheduled", message: "Your vet scheduled an appointment on {date} at {time}." },
  appointmentScheduledAnimal: {
    title: "Appointment scheduled",
    message: "Your vet scheduled a visit for {animal} on {date} at {time}.",
  },
  consultationStatus: { title: "Consultation {status}", message: "Your consultation was marked {status}. {feedback}" },
  consultationStatusAnimal: {
    title: "Consultation {status}",
    message: "Your consultation for {animal} was marked {status}. {feedback}",
  },
  consultationDocument: { title: "New document from your vet", message: 'Your vet added "{name}" to your consultation.' },
  consultationDocumentAnimal: {
    title: "New document from your vet",
    message: 'Your vet added "{name}" to your consultation for {animal}.',
  },

  // Messages and support
  chatMessage: { title: "New message from {sender}", message: "{preview}" },
  chatReported: { title: "Chat report filed", message: "{reporter} reported a conversation: {reason}" },
  supportTicketNew: { title: "New support ticket", message: "{requester} opened: {subject}" },
  supportReply: { title: "Support ticket reply", message: "{staff} replied: {preview}" },
  supportResolved: { title: "Support ticket resolved", message: '{staff} marked your ticket "{subject}" as resolved' },
  supportReopened: { title: "Support ticket reopened", message: '{staff} reopened your ticket "{subject}"' },

  // Built fresh for the admin portal on each request (app/api/admin/notifications)
  doctorUnavailable: { title: "Doctor Unavailable", message: "Dr. {doctor} marked unavailable" },
  adminTicketNew: { title: "New support ticket", message: "{requester} ({role}): {subject}" },
  adminTicketReply: { title: "Support ticket reply", message: "{requester} ({role}): {subject}" },
  newFarmer: { title: "New User Registration", message: "Farmer {name} registered" },
  newDoctor: { title: "New User Registration", message: "Doctor {name} registered" },
  "adminConsultation.accepted": { title: "Consultation accepted", message: "Dr. {doctor} accepted consultation" },
  "adminConsultation.rejected": { title: "Consultation rejected", message: "Dr. {doctor} rejected consultation" },
  "adminConsultation.completed": { title: "Consultation completed", message: "Dr. {doctor} completed consultation" },
  responseTimeAlert: { title: "Response Time Alert", message: "Dr. {doctor} exceeded 30-min target ({minutes} min)" },
  dailyPerformance: { title: "Daily Performance Report", message: "{rate}% consultation completion rate (Target: 90%)" },
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

  privilegedAccount: {
    title: "Konti ifite uburenganzira bwihariye yafunguwe",
    message: "Konti nshya ya {role} yafunguriwe {email}.",
  },
  accountLockedOut: {
    title: "Konti yafunzwe by'agateganyo",
    message: "{email} yafunzwe by'agateganyo nyuma yo kugerageza kwinjira inshuro {count} bikanga.",
  },
  cronFailed: { title: "Igikorwa giteganyijwe cyanze", message: "{job} ntiyashoboye gukora: {error}" },
  highRegistrations: {
    title: "Abiyandikisha ari benshi",
    message: "Abakoresha bashya {count} biyandikishije mu masaha 24 ashize",
  },
  highPendingConsultations: { title: "Randevu nyinshi zitegereje", message: "Randevu {count} zitegereje gusuzumwa" },
  failedLoginSpike: {
    title: "Iburira ry'umutekano",
    message: "Habonetse kugerageza kwinjira {count} byanze mu masaha 24 ashize",
  },
  highPendingListings: {
    title: "Ibyifuzo byinshi byo gutangaza bitegereje",
    message: "Ibyifuzo {count} byo gushyira ku isoko bitegereje gusuzumwa",
  },
  paymentFailureSpike: {
    title: "Ubwishyu bwinshi bwanze",
    message: "Ubwishyu {count} bw'amatumiza bwanze mu masaha 24 ashize",
  },

  "calving.14": { title: "Kubyara kwegereje", message: "Inka {animal} iteganyijwe kubyara mu byumweru nka bibiri." },
  "calving.7": { title: "Kubyara kwegereje", message: "Inka {animal} iteganyijwe kubyara mu cyumweru nka kimwe." },
  "calvingUnnamed.14": { title: "Kubyara kwegereje", message: "Inka yawe iteganyijwe kubyara mu byumweru nka bibiri." },
  "calvingUnnamed.7": { title: "Kubyara kwegereje", message: "Inka yawe iteganyijwe kubyara mu cyumweru nka kimwe." },
  calfReady: {
    title: "Inyana yiteguye kwimurirwa mu matungo yawe",
    message:
      '{names} ubu ifite amezi {months}. Fungura Inyana ukoreshe "Yimurira mu matungo" kugira ngo uyongere mu bushyo bwawe.',
  },
  calvesReady: {
    title: "Inyana ziteguye kwimurirwa mu matungo yawe",
    message:
      '{names} ubu zifite amezi {months} cyangwa arenga. Fungura Inyana ukoreshe "Yimurira mu matungo" kugira ngo uzongere mu bushyo bwawe.',
  },
  calvesReadyMore: {
    title: "Inyana ziteguye kwimurirwa mu matungo yawe",
    message:
      '{names} n\'izindi {more} ubu zifite amezi {months} cyangwa arenga. Fungura Inyana ukoreshe "Yimurira mu matungo" kugira ngo uzongere mu bushyo bwawe.',
  },

  consultationRequested: { title: "Icyifuzo gishya cya randevu", message: "{farmer} yasabye randevu." },
  consultationRequestedAnimal: { title: "Icyifuzo gishya cya randevu", message: "{farmer} yasabye randevu ku itungo {animal}." },
  appointmentScheduled: { title: "Randevu yateganyijwe", message: "Muganga wawe yateganyije randevu ku wa {date} saa {time}." },
  appointmentScheduledAnimal: {
    title: "Randevu yateganyijwe",
    message: "Muganga wawe yateganyije gusura itungo {animal} ku wa {date} saa {time}.",
  },
  consultationStatus: { title: "Randevu: {status}", message: "Imiterere ya randevu yawe ubu ni: {status}. {feedback}" },
  consultationStatusAnimal: {
    title: "Randevu: {status}",
    message: "Imiterere ya randevu yawe ku itungo {animal} ubu ni: {status}. {feedback}",
  },
  consultationDocument: {
    title: "Inyandiko nshya ivuye kwa muganga wawe",
    message: 'Muganga wawe yongeyeho "{name}" kuri randevu yawe.',
  },
  consultationDocumentAnimal: {
    title: "Inyandiko nshya ivuye kwa muganga wawe",
    message: 'Muganga wawe yongeyeho "{name}" kuri randevu yawe y\'itungo {animal}.',
  },

  chatMessage: { title: "Ubutumwa bushya buvuye kuri {sender}", message: "{preview}" },
  chatReported: { title: "Ikiganiro cyatanzweho ikirego", message: "{reporter} yatanze ikirego ku kiganiro: {reason}" },
  supportTicketNew: { title: "Icyifuzo gishya cy'ubufasha", message: "{requester} yafunguye: {subject}" },
  supportReply: { title: "Igisubizo ku cyifuzo cy'ubufasha", message: "{staff} yasubije: {preview}" },
  supportResolved: {
    title: "Icyifuzo cy'ubufasha cyakemutse",
    message: '{staff} yemeje ko icyifuzo cyawe "{subject}" cyakemutse',
  },
  supportReopened: {
    title: "Icyifuzo cy'ubufasha cyongeye gufungurwa",
    message: '{staff} yongeye gufungura icyifuzo cyawe "{subject}"',
  },

  doctorUnavailable: { title: "Muganga ntaboneka", message: "Dr. {doctor} yatangaje ko ataboneka" },
  adminTicketNew: { title: "Icyifuzo gishya cy'ubufasha", message: "{requester} ({role}): {subject}" },
  adminTicketReply: { title: "Igisubizo ku cyifuzo cy'ubufasha", message: "{requester} ({role}): {subject}" },
  newFarmer: { title: "Umukoresha mushya yiyandikishije", message: "Umworozi {name} yiyandikishije" },
  newDoctor: { title: "Umukoresha mushya yiyandikishije", message: "Muganga {name} yiyandikishije" },
  "adminConsultation.accepted": { title: "Randevu yemewe", message: "Dr. {doctor} yemeye randevu" },
  "adminConsultation.rejected": { title: "Randevu yanzwe", message: "Dr. {doctor} yanze randevu" },
  "adminConsultation.completed": { title: "Randevu yarangiye", message: "Dr. {doctor} yarangije randevu" },
  responseTimeAlert: {
    title: "Iburira ku gihe cyo gusubiza",
    message: "Dr. {doctor} yarengeje intego y'iminota 30 (iminota {minutes})",
  },
  dailyPerformance: {
    title: "Raporo y'umunsi",
    message: "Igipimo cyo kurangiza randevu ni {rate}% (Intego: 90%)",
  },
}

const TEMPLATES: Record<string, Record<NotificationId, Template>> = { en, rw }

/** What a notification stores so a screen can show it in another language. */
export interface NotificationI18n {
  id: NotificationId
  params: NotificationParams
}

/** A notification's stored type (system, chat, marketplace...) as a label in the reader's language. */
export function notificationTypeLabel(type: string | null | undefined, t: (key: string) => string): string {
  if (!type) return ""
  const label = t(`notifType.${type}`)
  return label === `notifType.${type}` ? type.replace(/_/g, " ") : label
}

/** A notification's stored priority (low, normal, high...) as a label in the reader's language. */
export function notificationPriorityLabel(priority: string | null | undefined, t: (key: string) => string): string {
  if (!priority) return ""
  const label = t(`notifPriority.${priority}`)
  return label === `notifPriority.${priority}` ? priority : label
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
        // Read back from the database, so don't trust the shape. A key with no translation
        // (t hands the key back) falls back to the stored English.
        const labels = translate && Array.isArray(value.keys) ? value.keys.map((key) => [String(key), translate(String(key))]) : null
        return labels && labels.every(([key, label]) => label !== key)
          ? labels.map(([, label]) => label).join(", ")
          : String(value.text ?? "")
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
