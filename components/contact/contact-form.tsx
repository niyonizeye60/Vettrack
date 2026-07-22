"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { sendContactEmail } from "@/lib/actions/send-contact-email"

export default function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const result = await sendContactEmail({ name, email, phone, message })

      if (!result.success) {
        setError(result.message)
        return
      }

      setIsSuccess(true)
      setName("")
      setEmail("")
      setPhone("")
      setMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="salon-card p-8 shadow-salon">
      <h2 className="heading-md mb-6 flex items-center">
        <span className="w-8 h-0.5 bg-primary mr-2"></span>
        {t('contact.form.title')}
      </h2>

      {isSuccess ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('contact.form.success')}</h3>
          <p className="text-gray-600 mb-4">{t('contact.form.thankYou')}</p>
          <Button
            onClick={() => setIsSuccess(false)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md"
          >
            {t('contact.form.sendAnother')}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="name">{t('common.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('contact.form.namePlaceholder')}
              required
              className="border-gray-300 focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.form.emailPlaceholder')}
                required
                className="border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('contact.form.phonePlaceholder')}
                required
                className="border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="message">{t('common.message')}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('contact.form.messagePlaceholder')}
              rows={5}
              required
              className="border-gray-300 focus:border-primary focus:ring-primary"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('contact.form.sending') : t('common.send') + ' ' + t('common.message')}
          </Button>
        </form>
      )}
    </div>
  )
}
