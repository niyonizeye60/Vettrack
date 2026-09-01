export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/db"
import { getActiveRule } from "@/lib/db-commission-rules"
import { computeFee } from "@/lib/commission"
import { createBrokerageOrder, ListingUnavailableError, OrderValidationError } from "@/lib/db-orders"
import { buyerSchema } from "@/lib/validations/checkout"

const DB_NAME = "ntdm_animal_hospital"

/**
 * GET - what it costs to be connected to this animal's seller, and whether the
 * animal is still available.
 *
 * Public, because buyers browse without an account. It returns the fee and the
 * animal's asking price, never the seller's contact details - those are what the
 * fee buys.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const client = await clientPromise
    const listing = await client
      .db(DB_NAME)
      .collection("services")
      .findOne({ _id: new ObjectId(params.id) })

    if (!listing || listing.category !== "sales") {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const animalPrice = Number(listing.price) || 0
    const rule = await getActiveRule("sales")

    const heldUntil = listing.reservedUntil ? new Date(listing.reservedUntil) : null
    const heldNow = listing.listingStatus === "reserved" && !!heldUntil && heldUntil > new Date()
    const finished = listing.listingStatus === "sold" || listing.listingStatus === "withdrawn"

    return NextResponse.json({
      listingId: params.id,
      name: listing.name,
      animalPrice,
      feeAmount: computeFee(rule, animalPrice),
      available: !heldNow && !finished,
      status: finished ? listing.listingStatus : heldNow ? "reserved" : "active",
    })
  } catch (error) {
    console.error("Error quoting connection fee:", error)
    return NextResponse.json({ error: "Failed to load listing" }, { status: 500 })
  }
}

/**
 * POST - open a connection order for this animal.
 *
 * Holds the animal for the buyer and returns an order whose total is the fee. The
 * existing payment routes take it from here unchanged; nothing about Pesapal or
 * IntouchPay had to know brokerage exists.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const parsed = buyerSchema.safeParse(body?.buyer)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Enter your details" },
        { status: 400 }
      )
    }

    const buyer = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      district: parsed.data.district || undefined,
      sector: parsed.data.sector || undefined,
      village: parsed.data.village || undefined,
      notes: parsed.data.notes || undefined,
    }

    const order = await createBrokerageOrder(params.id, buyer)

    return NextResponse.json({
      orderId: order._id.toString(),
      total: order.total,
      feeAmount: order.brokerage?.feeAmount ?? order.total,
      animalPrice: order.brokerage?.animalPrice ?? 0,
    })
  } catch (error) {
    if (error instanceof ListingUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error creating connection order:", error)
    return NextResponse.json({ error: "Could not start the connection" }, { status: 500 })
  }
}
