/**
 * Error messages the marketplace API sends back, in each language the app speaks.
 *
 * Routes, validators and the listing data layer take their English from here
 * (errorMessage) and send it as `error`, as before. A screen passes what it got to
 * localizeError, which finds the message by its English text - both ends read this
 * one table, so they can't drift apart. Anything not in it (a message from elsewhere,
 * or zod's built-in wording) shows as sent.
 *
 * Placeholders are {name}.
 */

const en = {
  unauthorized: "Unauthorized",
  forbidden: "Forbidden",
  invalidRequest: "Invalid request",
  invalidDecision: "Invalid decision",
  invalidStock: "Invalid stock",
  invalidId: "Invalid id",

  // Listing requests
  requestNotFound: "Request not found",
  requestSubmitFailed: "Failed to submit request",
  requestUpdateFailed: "Failed to update request",
  requestDeleteFailed: "Failed to delete request",
  alreadyReviewed: "This request has already been reviewed",
  onlyRejectedResubmit: "Only a request that was not approved can be resubmitted",
  cannotResubmit: "This request can no longer be resubmitted",
  cannotWithdraw: "This request can no longer be withdrawn",
  onlyPublishedRemoved: "Only a published listing can be removed",
  listingGone: "This listing is no longer on the marketplace",
  removalAlreadyPending: "A removal request is already waiting for review",
  noRemovalPending: "There is no removal request waiting on this listing",
  removalAlreadyDecided: "This removal request has already been decided",
  onlyOffMarketDeleted: "Only a post that is unpublished or has been removed can be deleted",
  cannotDelete: "This post can no longer be deleted",
  onlyPublishedEdited: "Only a published listing can be edited",
  removedNoEdit: "This listing was removed and can no longer be edited",
  nothingChanged: "Nothing was changed",
  cannotEdit: "This listing can no longer be edited",
  "editSold.animal": "This animal has been sold or withdrawn, so it can't be edited",
  "editSold.drug": "This drug has been sold or withdrawn, so it can't be edited",
  "editSold.feed": "This feed has been sold or withdrawn, so it can't be edited",
  "editHeld.animal": "A buyer is arranging this animal right now, so it can't be edited until that finishes",
  "editHeld.drug": "A buyer is arranging this drug right now, so it can't be edited until that finishes",
  "editHeld.feed": "A buyer is arranging this feed right now, so it can't be edited until that finishes",
  "expiresTooSoon.drug":
    "This drug expires too soon to list: it must stay on sale for at least {days} days. Choose an expiry date on or after {date}.",
  "expiresTooSoon.feed":
    "This feed expires too soon to list: it must stay on sale for at least {days} days. Choose an expiry date on or after {date}.",
  "stockNotPublished.drug": "Only a published drug has stock to update",
  "stockNotPublished.feed": "Only a published feed has stock to update",
  "stockRemoved.drug": "This drug was removed from the pharmacy page",
  "stockRemoved.feed": "This feed was removed from the feeds page",
  "stockGone.drug": "This drug is no longer on the pharmacy page",
  "stockGone.feed": "This feed is no longer on the feeds page",

  // Seller forms (lib/validations/listing-request.ts)
  listingTitle: "Give the listing a short title",
  chooseAnimalType: "Choose the type of animal",
  describeAnimal: "Describe the animal in a sentence or two",
  chooseDistrict: "Choose a district",
  addPhoto: "Add at least one photo",
  wholeNumber: "Enter a whole number",
  priceAboveZero: "Enter a price above zero",
  expiryOnPack: "Enter the expiry date on the pack",
  drugName: "Give the drug a name",
  chooseDrugType: "Choose the type of drug",
  stockCount: "Enter how many you have in stock",
  describeDrug: "Describe the drug in a sentence or two",
  feedName: "Give the feed a name",
  chooseFeedType: "Choose the type of feed",
  chooseQuality: "Choose the quality from the list",
  chooseTargetAnimal: "Choose the animal from the list",
  feedUnit: "Say what one unit is, e.g. a 50 kg bag",
  describeFeed: "Describe the feed in a sentence or two",
  stockNotNegative: "Stock can't be below zero",
  chooseCategory: "Choose a category",
  tellSellerWhy: "Tell the seller why",

  // Staff listings (app/api/services, lib/validations/product.ts)
  expiryFormat: "Enter the expiry date as YYYY-MM-DD",
  stockRequired: "Enter how many units are in stock - every drug and feed must have a count",
  invalidProduct: "Invalid product details",
  serviceNotFound: "Service not found",
  serviceCreateFailed: "Failed to create service",
  serviceUpdateFailed: "Failed to update service",
} as const

export type ErrorId = keyof typeof en

const rw: Record<ErrorId, string> = {
  unauthorized: "Ugomba kubanza kwinjira",
  forbidden: "Ntiwemerewe gukora ibi",
  invalidRequest: "Ibyoherejwe ntibyemewe",
  invalidDecision: "Icyemezo ntikiboneye",
  invalidStock: "Umubare w'ububiko ntuboneye",
  invalidId: "Ikiranga ntikiboneye",

  requestNotFound: "Icyifuzo nticyabonetse",
  requestSubmitFailed: "Icyifuzo nticyoherejwe. Ongera ugerageze.",
  requestUpdateFailed: "Ntibyashoboye kubikwa. Ongera ugerageze.",
  requestDeleteFailed: "Ntibyashoboye gusibwa. Ongera ugerageze.",
  alreadyReviewed: "Iki cyifuzo cyamaze gusuzumwa",
  onlyRejectedResubmit: "Icyifuzo kitemewe ni cyo cyonyine gishobora kongera koherezwa",
  cannotResubmit: "Iki cyifuzo ntikigishobora kongera koherezwa",
  cannotWithdraw: "Iki cyifuzo ntikigishobora gukurwaho",
  onlyPublishedRemoved: "Itangazo ryatangajwe ni ryo ryonyine rishobora gukurwaho",
  listingGone: "Iri tangazo ntirikiri ku isoko",
  removalAlreadyPending: "Hari icyifuzo cyo gukuraho gitegereje gusuzumwa",
  noRemovalPending: "Nta cyifuzo cyo gukuraho gitegereje kuri iri tangazo",
  removalAlreadyDecided: "Iki cyifuzo cyo gukuraho cyamaze gufatirwa icyemezo",
  onlyOffMarketDeleted: "Itangazo ritatangajwe cyangwa ryakuweho ni ryo ryonyine rishobora gusibwa",
  cannotDelete: "Iri tangazo ntirigishobora gusibwa",
  onlyPublishedEdited: "Itangazo ryatangajwe ni ryo ryonyine rishobora guhindurwa",
  removedNoEdit: "Iri tangazo ryakuweho, ntirigishobora guhindurwa",
  nothingChanged: "Nta cyahindutse",
  cannotEdit: "Iri tangazo ntirigishobora guhindurwa",
  "editSold.animal": "Iri tungo ryagurishijwe cyangwa ryakuweho, ntirigishobora guhindurwa",
  "editSold.drug": "Uyu muti waguzwe cyangwa wakuweho, ntugishobora guhindurwa",
  "editSold.feed": "Ibi biryo byaguzwe cyangwa byakuweho, ntibigishobora guhindurwa",
  "editHeld.animal": "Hari umuguzi uri gutegura kugura iri tungo ubu, ntirishobora guhindurwa kugeza birangiye",
  "editHeld.drug": "Hari umuguzi uri gutegura kugura uyu muti ubu, ntushobora guhindurwa kugeza birangiye",
  "editHeld.feed": "Hari umuguzi uri gutegura kugura ibi biryo ubu, ntibishobora guhindurwa kugeza birangiye",
  "expiresTooSoon.drug":
    "Uyu muti urarangira vuba cyane ku buryo utatangazwa: ugomba kumara nibura iminsi {days} ku isoko. Hitamo itariki yo kurangira ya {date} cyangwa nyuma yayo.",
  "expiresTooSoon.feed":
    "Ibi biryo birarangira vuba cyane ku buryo bitatangazwa: bigomba kumara nibura iminsi {days} ku isoko. Hitamo itariki yo kurangira ya {date} cyangwa nyuma yayo.",
  "stockNotPublished.drug": "Umuti watangajwe ni wo wonyine ufite ububiko bwo kuvugurura",
  "stockNotPublished.feed": "Ibiryo byatangajwe ni byo byonyine bifite ububiko bwo kuvugurura",
  "stockRemoved.drug": "Uyu muti wakuwe ku rupapuro rw'imiti",
  "stockRemoved.feed": "Ibi biryo byakuwe ku rupapuro rw'ibiryo by'amatungo",
  "stockGone.drug": "Uyu muti ntukiri ku rupapuro rw'imiti",
  "stockGone.feed": "Ibi biryo ntibikiri ku rupapuro rw'ibiryo by'amatungo",

  listingTitle: "Andika umutwe mugufi w'itangazo",
  chooseAnimalType: "Hitamo ubwoko bw'itungo",
  describeAnimal: "Sobanura itungo mu nteruro imwe cyangwa ebyiri",
  chooseDistrict: "Hitamo akarere",
  addPhoto: "Ongeraho nibura ifoto imwe",
  wholeNumber: "Andika umubare wuzuye",
  priceAboveZero: "Andika igiciro kiri hejuru ya zeru",
  expiryOnPack: "Andika itariki yo kurangira iri ku gapaki",
  drugName: "Andika izina ry'umuti",
  chooseDrugType: "Hitamo ubwoko bw'umuti",
  stockCount: "Andika umubare w'ibyo ufite mu bubiko",
  describeDrug: "Sobanura umuti mu nteruro imwe cyangwa ebyiri",
  feedName: "Andika izina ry'ibiryo",
  chooseFeedType: "Hitamo ubwoko bw'ibiryo",
  chooseQuality: "Hitamo ubwiza buri ku rutonde",
  chooseTargetAnimal: "Hitamo itungo riri ku rutonde",
  feedUnit: "Vuga igice kimwe icyo ari cyo, urugero umufuka w'ibiro 50",
  describeFeed: "Sobanura ibiryo mu nteruro imwe cyangwa ebyiri",
  stockNotNegative: "Ububiko ntibushobora kujya munsi ya zeru",
  chooseCategory: "Hitamo icyiciro",
  tellSellerWhy: "Bwira umugurisha impamvu",

  expiryFormat: "Andika itariki yo kurangira mu buryo YYYY-MM-DD",
  stockRequired: "Andika umubare w'ibiri mu bubiko - buri muti n'ibiryo bigomba kugira umubare",
  invalidProduct: "Amakuru y'igicuruzwa ntaboneye",
  serviceNotFound: "Itangazo ntiryabonetse",
  serviceCreateFailed: "Ntibyashoboye gushyiraho itangazo. Ongera ugerageze.",
  serviceUpdateFailed: "Ntibyashoboye kuvugurura itangazo. Ongera ugerageze.",
}

const MESSAGES: Record<string, Record<ErrorId, string>> = { en, rw }

type Params = Record<string, string | number>

const fill = (template: string, params: Params) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))

/** The English an API sends for `id`. */
export function errorMessage(id: ErrorId, params: Params = {}): string {
  return fill(en[id], params)
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** English text to id; templates with placeholders match by pattern, capturing the values. */
const EXACT = new Map<string, ErrorId>()
const PATTERNS: { id: ErrorId; names: string[]; pattern: RegExp }[] = []
for (const id of Object.keys(en) as ErrorId[]) {
  const names = Array.from(en[id].matchAll(/\{(\w+)\}/g), (match) => match[1])
  if (names.length === 0) {
    EXACT.set(en[id], id)
  } else {
    const source = en[id].split(/\{\w+\}/).map(escapeRegExp).join("(.+?)")
    PATTERNS.push({ id, names, pattern: new RegExp(`^${source}$`) })
  }
}

/**
 * An API error message in `language`. Returns undefined for no message, so a screen
 * can fall back to its own wording; a message not in the table comes back unchanged.
 */
export function localizeError(message: unknown, language: string): string | undefined {
  if (typeof message !== "string" || message === "") return undefined
  const messages = MESSAGES[language]
  if (!messages) return message
  const id = EXACT.get(message)
  if (id) return messages[id]
  for (const { id, names, pattern } of PATTERNS) {
    const match = message.match(pattern)
    if (match) return fill(messages[id], Object.fromEntries(names.map((name, i) => [name, match[i + 1]])))
  }
  return message
}
