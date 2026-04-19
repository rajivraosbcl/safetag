"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import QRCode from "qrcode.react"

function QRLandingContent() {
  const searchParams = useSearchParams()
  const carNumber = searchParams.get("car")

  const [driver, setDriver] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [callInitiated, setCallInitiated] = useState(false)

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        if (!carNumber) {
          setError("No car information provided")
          setLoading(false)
          return
        }

        const { data, error: fetchError } = await supabase
          .from("users")
          .select("id, full_name, car_number, phone_number, subscription_status, subscription_expiry")
          .eq("car_number", carNumber.toUpperCase())
          .eq("user_type", "driver")
          .single()

        if (fetchError || !data) {
          setError("Driver not found")
          return
        }

        // Check if driver has active subscription
        const isActive =
          data.subscription_status === "active" &&
          new Date(data.subscription_expiry) > new Date()

        setDriver({ ...data, isActive })
      } catch (err: any) {
        setError("Error fetching driver information")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDriver()
  }, [carNumber])

  const handleCallDriver = async () => {
    if (!driver || !driver.isActive) {
      setError("Driver's subscription is not active")
      return
    }

    try {
      setCallInitiated(true)
      // Get a temporary user ID or create anonymous session
      const tempUserId = localStorage.getItem("tempUserId") || `anon_${Date.now()}`
      localStorage.setItem("tempUserId", tempUserId)

      const response = await fetch("/api/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          userId: tempUserId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to initiate call")
      } else {
        setError("")
        alert("Call initiated! The driver will receive your call shortly.")
      }
    } catch (err: any) {
      setError("Error initiating call: " + err.message)
    } finally {
      setCallInitiated(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      setError("Please enter a message")
      return
    }

    try {
      setIsSending(true)
      const tempUserId = localStorage.getItem("tempUserId") || `anon_${Date.now()}`
      localStorage.setItem("tempUserId", tempUserId)

      const response = await fetch("/api/message/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          userId: tempUserId,
          message: messageText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send message")
      } else {
        setMessageText("")
        setError("")
        alert("Message sent to driver!")
      }
    } catch (err: any) {
      setError("Error sending message: " + err.message)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="mt-4 text-gray-600">Loading driver information...</p>
        </div>
      </main>
    )
  }

  if (!driver) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Not Found</h1>
            <p className="text-gray-600">{error || "The QR code may be invalid or expired"}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      {/* Header */}
      <nav className="max-w-2xl mx-auto mb-8 pt-4">
        <a href="/" className="text-xl font-bold text-gray-900">
          Safe<span className="text-emerald-600">Tag</span>
        </a>
      </nav>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Status Banner */}
          {driver.isActive ? (
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white text-center">
              <p className="font-semibold">✓ Driver is available</p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white text-center">
              <p className="font-semibold">✗ Driver subscription inactive</p>
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Driver Info */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl text-white">🚗</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{driver.full_name}</h1>
              <p className="text-2xl font-mono text-emerald-600 mb-1">{driver.car_number}</p>
              <p className="text-sm text-gray-500">Car Registration Number</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={handleCallDriver}
                disabled={!driver.isActive || callInitiated}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  driver.isActive && !callInitiated
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {callInitiated ? "Calling..." : "📞 Call Driver"}
              </button>
              <button
                onClick={() => document.getElementById("messageBox")?.focus()}
                className="py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                💬 Send Message
              </button>
            </div>

            {/* Message Box */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Send a message to the driver
              </label>
              <textarea
                id="messageBox"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here... (Available to all members)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none h-24 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !messageText.trim()}
                className={`mt-3 w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  isSending || !messageText.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>All communications are private and secure.</p>
          <p>The driver cannot see your phone number.</p>
        </div>
      </div>
    </main>
  )
}

export default function QRLanding() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <QRLandingContent />
    </Suspense>
  )
}
