import Image from "next/image"
import Link from "next/link"

const LAST_UPDATED = "July 18, 2026"

export default function PrivacyContent() {
  return (
    <>
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
            alt="Data protection and security"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
        </div>
        <div className="container-custom relative z-10">
          <div className="max-w-2xl text-white">
            <h1 className="heading-xl mb-4 text-blue-600">Privacy Policy</h1>
            <p className="text-xl text-white/90">
              How NTDM Animal Hospital collects, uses, and protects your information.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom pt-16 mb-20 max-w-4xl">
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              This Privacy Policy explains what information NTDM Animal Hospital ("Vettrack", "we", "us", "our")
              collects through the platform, how we use it, and the choices you have. By using the platform, you
              agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account information:</strong> name, email, phone number, and, for farmers, district/sector; for veterinarians, license number and specialization.</li>
              <li><strong>Animal &amp; health data:</strong> details you enter about your animals, consultations, treatments, and vaccination records.</li>
              <li><strong>Tracking device data:</strong> location, heart rate, and temperature readings from any connected tracking device you configure.</li>
              <li><strong>Communications:</strong> messages sent through the platform's chat, and booking or contact form submissions.</li>
              <li><strong>Usage data:</strong> basic analytics about how the platform is used, collected via Google Analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and maintain your account and the services you request.</li>
              <li>Connect you with veterinarians or farmers for consultations.</li>
              <li>Display tracking data and send health alerts (for example, fever or hypothermia alerts) based on device readings.</li>
              <li>Send booking confirmations, password reset links, and service-related notifications.</li>
              <li>Improve the platform and understand how it is used.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. How We Share Your Information</h2>
            <p>
              We do not sell your personal information. We share it only as needed to operate the platform:
              with the veterinarian or farmer involved in a consultation you initiate, with sellers you choose to
              contact through a marketplace listing, and with service providers that support our operations (such
              as our email delivery provider and, if you configure a tracking device, ThingSpeak as the IoT data
              provider). We may also disclose information if required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Cookies &amp; Analytics</h2>
            <p>
              We use Google Analytics to understand aggregate usage of the platform. You can control cookies
              through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Data Security</h2>
            <p>
              We take reasonable technical measures to protect your information, including encrypted password
              storage and access controls based on your account role. No online service can be guaranteed
              completely secure, but we work to keep your data protected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <p>
              We retain your account and animal health data for as long as your account is active, or as needed to
              provide the service. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
            <p>
              You may access, correct, or request deletion of your personal information by contacting us. You can
              update most account details directly from your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>
              The platform is intended for use by adults managing animal health and veterinary services. We do not
              knowingly collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will update the "Last updated" date above
              when we do.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p>
              Questions about this Privacy Policy can be sent to{" "}
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
