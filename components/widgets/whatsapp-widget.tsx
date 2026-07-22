"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X, Check, Send } from "lucide-react"

export default function EnhancedWhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [name, setName] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastSeen, setLastSeen] = useState("today at 10:23 AM")
  const phoneNumber = "+250780519960"
  
  // Simulate online status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(Math.random() > 0.3)
    }, 60000)
    return () => clearInterval(interval)
  }, [])
  
  const handleSubmit = () => {
    if (!name || !message) return
    
    const whatsappMessage = encodeURIComponent(`Hello, my name is ${name}. ${message}`)
    window.open(`https://wa.me/${phoneNumber.replace(/\s+/g, '')}?text=${whatsappMessage}`, "_blank")
    
    setIsOpen(false)
    setMessage("")
  }
  
  // Simulate typing indicator
  useEffect(() => {
    if (message) {
      setIsTyping(true)
      const timeout = setTimeout(() => setIsTyping(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [message])

  return (
    <>
      {/* WhatsApp Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#128C7E] transition-all duration-300 flex items-center justify-center"
        aria-label="Contact us on WhatsApp"
      >
        {isOpen ? 
          <X className="h-6 w-6" /> : 
          <MessageCircle className="h-6 w-6" />
        }
      </button>
      
      {/* WhatsApp Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 bg-white rounded-lg shadow-xl w-80 overflow-hidden">
          {/* Header */}
          <div className="bg-[#075E54] text-white p-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 212 212" width="40" height="40">
                    <path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"></path>
                    <path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.653.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.678 0 52.761-11.103 71.055-29.095v-.289s-.619-1.45-1.992-3.778a58.346 58.346 0 0 0-1.446-2.322zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z"></path>
                  </svg>
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">Customer Support</h3>
                <p className="text-xs opacity-80">
                  {isOnline ? 'Online' : `Last seen ${lastSeen}`}
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Chat Background */}
          <div 
            className="bg-[#ECE5DD] h-64 overflow-auto p-3 flex flex-col space-y-2"
            style={{
              backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGwAAABsCAQAAAAlb59GAAACH0lEQVR4Xu3bMU7DQBCG0TiKCHdF5QIUKVyi5g4cA67BBWhTIRqUAoFixQ1xiP8IoYjHgZ3dl+zM9ylZa7zyZrOJ7WqFJEmSJEmSJClNbavTdtvGdJOc19vjMQ+Zp7P9ejXVeX0/HnPILB3sj9gqjy9nuGNXR11J6nK3evHuC8SJ9v2S+PU8QrT5DZaVoYsdkKUBXe2CJA3pewekqK9YRwR1xRUTCYS6/BxmJhAYyX8gQaMjAW1G8oUkDY4EtBUp9CaKPpIAzYwUejWHnmQA80XaGH+TMZIJzBXpaoPxS2Y0S6Tf+3K4JSOaL9J2WBAHmSFSGO2+JDOaP1I4hYdZXMgCZowUPo6wJBNaMFJ4ilmSAS0cKbyPDt+QGK0LXhQG3+UUFmRE6aLzn1X4QrC0IAOoi34Rvp6M+0gDpMuBvgQUx50nTJJ0UYskaIwkQWMkERolCdA4SYLGSKOOHlEkCRoniU9qXZAkJxDpSvJlIiRdZgLTFqQrTWDqBUxduuBQPYGpS5fbdKi2lGiuVwdvzeiCQzpIxTK96lBdQtQVH9e2ELUFh2ttMerKzw9aiDoePvWAMWpMTzDHicZ86jsaTQD9GCnA/BMp0OzfyYCmjxRo+puDQJM/XAg09S+kBJr71YdBE5tZSQya+Z3dBRr6DWWNNPKr4xQa+PV+6gjNe3Vsg6Z9BaFB074lIkmSJEmSJEmSJA3qBchDKWxQ/BkwAAAAAElFTkSuQmCC')",
              backgroundRepeat: "repeat"
            }}
          >
            {/* Welcome Message */}
            <div className="bg-white rounded-lg p-2 max-w-[80%] shadow-sm self-start relative">
              <p className="text-sm">Hello! 👋 How can we help you today?</p>
              <span className="text-[10px] text-gray-500 absolute bottom-1 right-2">10:22 AM</span>
              <div className="absolute -bottom-1 -left-1 transform rotate-45 w-3 h-3 bg-white"></div>
            </div>
            
            {isTyping && (
              <div className="bg-white rounded-lg p-3 max-w-[60%] shadow-sm self-start flex items-center space-x-1">
                <div className="bg-gray-300 rounded-full w-2 h-2 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="bg-gray-300 rounded-full w-2 h-2 animate-bounce" style={{ animationDelay: "200ms" }}></div>
                <div className="bg-gray-300 rounded-full w-2 h-2 animate-bounce" style={{ animationDelay: "400ms" }}></div>
              </div>
            )}
          </div>
          
          {/* Chat Input */}
          <div className="bg-[#F0F0F0] p-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full p-2 mb-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-[#25D366]"
            />
            <div className="flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 rounded-full focus:outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && name && message) {
                    handleSubmit()
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                className="ml-2 bg-[#25D366] text-white p-2 rounded-full hover:bg-[#128C7E] transition-colors flex items-center justify-center"
                disabled={!name || !message}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-white p-2 text-center border-t">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <span>Secured by </span>
              <span className="text-[#25D366] font-semibold ml-1 flex items-center">
                WhatsApp
                <Check className="h-3 w-3 ml-1 text-[#25D366]" />
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}