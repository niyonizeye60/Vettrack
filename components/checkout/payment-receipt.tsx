"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle, Store, User, Phone, CreditCard, Shield, FileText } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
  sellerName?: string | null
  sellerPhone?: string | null
  commissionPercentage?: number | null
  commissionAmount?: number | null
  sellerAmount?: number | null
}

interface ReceiptProps {
  orderId: string
  items: ReceiptItem[]
  subtotal: number
  total: number
  commissionPercentage: number
  commissionTotal: number
  sellerTotal: number
  buyer: {
    name: string
    phone: string
    email?: string
    district?: string
    sector?: string
  }
  paymentMethod?: string
  paidAt?: string
  createdAt?: string
}

export default function PaymentReceipt({
  orderId,
  items,
  subtotal,
  total,
  commissionPercentage,
  commissionTotal,
  sellerTotal,
  buyer,
  paymentMethod,
  paidAt,
  createdAt,
}: ReceiptProps) {
  const { t } = useLanguage()
  const receiptRef = useRef<HTMLDivElement>(null)
  const methodLabel = paymentMethod === "intouchpay" ? t("receipt.momo") : t("receipt.card")

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t("receipt.notAvailable")
    try {
      return new Date(dateStr).toLocaleDateString("en-RW", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const handleDownload = () => {
    const receipt = receiptRef.current
    if (!receipt) return

    // Create a printable version
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t("receipt.title")} - ${orderId}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 700px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 5px 0 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 14px; font-weight: 600; color: #2563eb; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .row .label { color: #666; }
          .row .value { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th { background: #f3f4f6; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #666; }
          td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .total-row { font-weight: 700; font-size: 16px; border-top: 2px solid #2563eb; padding-top: 10px; }
          .seller-badge { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 12px; margin: 5px 0; font-size: 13px; }
          .seller-badge .name { font-weight: 600; color: #1e40af; }
          .seller-badge .phone { color: #6b7280; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; }
          .success-badge { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐾 NTDM Animal Hospital</h1>
          <p>${t("receipt.title")}</p>
        </div>

        <div class="success-badge">✅ ${t("receipt.successUpper")}</div>

        <div class="section">
          <div class="section-title">${t("receipt.orderDetails")}</div>
          <div class="row"><span class="label">${t("receipt.orderId")}:</span><span class="value">${orderId}</span></div>
          <div class="row"><span class="label">${t("receipt.date")}:</span><span class="value">${formatDate(paidAt || createdAt)}</span></div>
          <div class="row"><span class="label">${t("receipt.paymentMethod")}:</span><span class="value">${methodLabel}</span></div>
        </div>

        <div class="section">
          <div class="section-title">${t("receipt.customerInfo")}</div>
          <div class="row"><span class="label">${t("receipt.name")}:</span><span class="value">${buyer.name}</span></div>
          <div class="row"><span class="label">${t("receipt.phone")}:</span><span class="value">${buyer.phone}</span></div>
          ${buyer.email ? `<div class="row"><span class="label">${t("receipt.email")}:</span><span class="value">${buyer.email}</span></div>` : ""}
          ${buyer.district ? `<div class="row"><span class="label">${t("receipt.location")}:</span><span class="value">${[buyer.district, buyer.sector].filter(Boolean).join(", ")}</span></div>` : ""}
        </div>

        <div class="section">
          <div class="section-title">${t("receipt.itemsPurchased")}</div>
          <table>
            <thead>
              <tr>
                <th>${t("receipt.item")}</th>
                <th>${t("receipt.qty")}</th>
                <th>${t("receipt.price")}</th>
                <th>${t("receipt.total")}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>
                    <strong>${item.name}</strong>
                    ${item.sellerName ? `<div class="seller-badge"><span class="name">🏪 ${item.sellerName}</span>${item.sellerPhone ? ` <span class="phone">📱 ${item.sellerPhone}</span>` : ""}</div>` : ""}
                  </td>
                  <td>${item.quantity}</td>
                  <td>RWF ${item.unitPrice.toLocaleString()}</td>
                  <td>RWF ${item.lineTotal.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">${t("receipt.paymentSummary")}</div>
          <div class="row"><span class="label">${t("receipt.subtotal")}:</span><span class="value">RWF ${subtotal.toLocaleString()}</span></div>
          ${commissionTotal > 0 ? `
            <div class="row"><span class="label">${t("receipt.platformCommission").replace("{percent}", String(commissionPercentage))}:</span><span class="value" style="color: #059669;">RWF ${commissionTotal.toLocaleString()}</span></div>
            <div class="row"><span class="label">${t("receipt.sellerEarnings")}:</span><span class="value" style="color: #2563eb;">RWF ${sellerTotal.toLocaleString()}</span></div>
          ` : ""}
          <div class="row total-row"><span class="label">${t("receipt.amountPaid")}:</span><span class="value" style="color: #166534;">RWF ${total.toLocaleString()}</span></div>
        </div>

        <div class="section">
          <div class="section-title">${t("receipt.sellerInfo")}</div>
          ${items.filter(i => i.sellerName).map(item => `
            <div class="seller-badge">
              <span class="name">🏪 ${item.sellerName}</span>
              ${item.sellerPhone ? ` — 📱 ${item.sellerPhone}` : ""}
              ${item.sellerAmount ? ` — 💰 ${t("receipt.received").replace("{amount}", item.sellerAmount.toLocaleString())}` : ""}
            </div>
          `).join("")}
          ${items.every(i => !i.sellerName) ? `<p style="color: #999; font-size: 13px;">${t("receipt.soldByNtdm")}</p>` : ""}
        </div>

        <div class="footer">
          <p>${t("receipt.thanks")} 🐾</p>
          <p>${t("receipt.computerGenerated")}</p>
          <p>${t("receipt.generatedOn").replace("{date}", new Date().toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }))}</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-4">
      {/* Visual Receipt Card */}
      <div ref={receiptRef} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
          <h2 className="text-xl font-bold flex items-center justify-center gap-2">
            🐾 NTDM Animal Hospital
          </h2>
          <p className="text-blue-100 text-sm mt-1">{t("receipt.title")}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-500/20 text-green-100 px-4 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            {t("receipt.success")}
          </div>
        </div>

        {/* Order Info */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 border-b border-gray-100 pb-3">
            <FileText className="h-4 w-4" />
            <span className="font-mono text-xs">{t("receipt.order").replace("{id}", orderId.slice(-12))}</span>
            <span className="ml-auto text-gray-400">{formatDate(paidAt || createdAt)}</span>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("receipt.itemsPurchased")}</h3>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × RWF {item.unitPrice.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">RWF {item.lineTotal.toLocaleString()}</p>
                  </div>
                  {/* Seller Info */}
                  {item.sellerName && (
                    <div className="mt-2 flex items-center gap-2 bg-blue-50 text-blue-700 rounded-md px-3 py-2 text-xs">
                      <Store className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium">{item.sellerName}</span>
                      {item.sellerPhone && (
                        <>
                          <span className="text-blue-300">·</span>
                          <Phone className="h-3 w-3" />
                          <span>{item.sellerPhone}</span>
                        </>
                      )}
                      {item.sellerAmount != null && (
                        <>
                          <span className="text-blue-300">·</span>
                          <span className="text-green-600 font-medium">
                            {t("receipt.sellerReceives").replace("{amount}", item.sellerAmount.toLocaleString())}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t("receipt.subtotal")}</span>
              <span>RWF {subtotal.toLocaleString()}</span>
            </div>
            {commissionTotal > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("receipt.platformCommission").replace("{percent}", String(commissionPercentage))}</span>
                  <span>RWF {commissionTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-blue-600">
                  <span>{t("receipt.totalToSellers")}</span>
                  <span>RWF {sellerTotal.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>{t("receipt.amountPaid")}</span>
              <span className="text-green-600">RWF {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("receipt.customer")}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="h-4 w-4 text-gray-400" />
              <span>{buyer.name}</span>
              <span className="text-gray-300">·</span>
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{buyer.phone}</span>
            </div>
            {buyer.email && (
              <p className="text-sm text-gray-500 mt-1 ml-6">{buyer.email}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
            <Shield className="h-3.5 w-3.5" />
            <span>{t("receipt.paidVia").replace("{method}", methodLabel)}</span>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <Button onClick={handleDownload} className="w-full" variant="outline">
        <Download className="h-4 w-4 mr-2" />
        {t("receipt.download")}
      </Button>
    </div>
  )
}
