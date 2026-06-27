"use client"

import { useEffect } from "react"
import { X, AlertTriangle } from "lucide-react"

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: "warning" | "error" | "info"
}

export function AlertModal({ isOpen, onClose, title, message, type = "warning" }: AlertModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle className="w-6 h-6 text-red-500" />
      case "info":
        return <AlertTriangle className="w-6 h-6 text-blue-500" />
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-500" />
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case "error":
        return "border-red-200"
      case "info":
        return "border-blue-200"
      default:
        return "border-amber-200"
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-xl border-2 ${getBorderColor()} max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}