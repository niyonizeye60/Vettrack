import Image from "next/image"
import Link from "next/link"

const LAST_UPDATED = "July 18, 2026"

export default function TermsContent() {
  return (
    <>
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
            alt="Signing an agreement"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
        </div>
        <div className="container-custom relative z-10">
          <div className="max-w-2xl text-white">
            <h1 className="heading-xl mb-4 text-blue-600">Terms of Service</h1>
            <p className="text-xl text-white/90">
              The rules for using NTDM Animal Hospital's tracking, consultation, and marketplace platform.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom pt-16 mb-20 max-w-4xl">
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or otherwise using the NTDM Animal Hospital platform ("Vettrack", "we", "us",
              "our"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree,
              please do not register for or use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              Vettrack connects farmers and pet owners with veterinary professionals in Rwanda. The platform
              provides animal health tracking devices and monitoring, veterinary consultations (in-person, farm
              visit, and virtual), disease screening and vaccination programs, and a marketplace for animal sales,
              veterinary medicine, and animal feeds.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
            <p>
              You must provide accurate, current information when registering, and keep your login credentials
              confidential. You are responsible for all activity that occurs under your account. Accounts are
              issued per role (farmer/pet owner, veterinarian, or administrator), and access to features is
              restricted based on that role.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Bookings, Consultations &amp; Payments</h2>
            <p>
              Consultation and service prices are shown in Rwandan Francs (RWF) at the time of booking and are
              subject to change. Booking a consultation does not guarantee immediate availability; we will contact
              you to confirm the appointment. Cancellations or rescheduling should be made as early as possible by
              contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Marketplace (Animal Sales, Pharmacy &amp; Feeds)</h2>
            <p>
              Listings for animals, medications, and feed products are provided by NTDM Animal Hospital and, in
              some cases, third-party sellers. We make reasonable efforts to ensure listings are accurate, but we
              do not guarantee the health, quality, or fitness of any animal or product listed. Any purchase
              arranged through a seller's contact details (phone or email) shown on a listing is a transaction
              between you and that seller; NTDM Animal Hospital is not a party to it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Tracking Devices &amp; Data</h2>
            <p>
              If you use an animal tracking device with the platform, sensor readings (such as location, heart
              rate, and temperature) are collected and displayed on your dashboard, and may trigger automated
              health alerts. You are responsible for keeping your device's configuration (channel ID and API key)
              accurate and confidential.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide false information about yourself, your animals, or listed products.</li>
              <li>Use the platform for any unlawful purpose or to harass other users.</li>
              <li>Attempt to access accounts, data, or systems you are not authorized to access.</li>
              <li>Interfere with the platform's normal operation or security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Medical Disclaimer</h2>
            <p>
              Virtual consultations and health tracking are intended to support, not replace, in-person veterinary
              care. In an emergency, contact a veterinarian or animal hospital directly rather than relying solely
              on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>
              The platform is provided "as is." To the fullest extent permitted by law, NTDM Animal Hospital is not
              liable for indirect, incidental, or consequential damages arising from your use of the platform,
              including reliance on tracking data or marketplace listings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms. You may stop using the platform, and
              request account deletion, at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Rwanda.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the platform after changes take effect
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">13. Contact Us</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a href="mailto:info@vettrack.rw" className="text-primary hover:underline">
                info@vettrack.rw
              </a>{" "}
              or via our{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
