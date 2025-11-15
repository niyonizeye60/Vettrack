import type { Metadata } from "next"
import BookingForm from "@/components/booking/booking-form"
import BookingBanner from "@/components/booking/booking-banner"

export const metadata: Metadata = {
  title: "Book a Consultation - NTDM Animal Hospital",
  description:
    "Book your consultation at NTDM Animal Hospital. Choose from our range of services and select a convenient time slot.",
}

export default function BookingPage() {
  return (
    <>
      <BookingBanner />
      <div className="py-16 bg-gray-50">
        <div className="container-custom">
          <BookingForm />
        </div>
      </div>
    </>
  )
}
