"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"
import QRCode from "qrcode.react"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("qr")
  const [messages, setMessages] = useState<any[]>([])
  const [callLogs, setCallLogs] = useState<any[]>([])

  useEffect(() => {
    const fetchUserData = async (authUser: any) => {
      try {
        if (!authUser) {
          window.location.href = "/login"
          return
        }

        // Fetch user details
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single()

        if (error || !userData) {
          console.error("Error fetching user:", error)
          console.error("Auth user ID:", authUser.id)
          console.error("User data:", userData)
          setLoading(false)
          return
        }

        setUser(userData)

        // Fetch messages sent to this driver
        const { data: messagesData } = await supabase
          .from("messages")
          .select("*")
          .eq("driver_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(20)

        setMessages(messagesData || [])

        // Fetch call logs
        const { data: callsData } = await supabase
          .from("call_logs")
          .select("*, caller:caller_id(full_name)")
          .eq("driver_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(20)

        setCallLogs(callsData || [])
      } catch (err: any) {
        console.error("Error:", err)
      } finally {
        setLoading(false)
      }
    }

    // Use onAuthStateChange to detect session changes (including magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserData(session.user)
        } else {
          window.location.href = "/login"
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard</p>
        </div>
      </div>
    )
  }

  const isSubscriptionActive =
    user.subscription_status === "active" &&
    new Date(user.subscription_expiry) > new Date()

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/qr?car=${user.car_number}`

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              Safe<span className="text-emerald-600">Tag</span> Dashboard
            </h1>
            <p className="text-sm text-gray-500">Welcome, {user.full_name}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Subscription Status */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {isSubscriptionActive ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <p className="text-emerald-800 font-semibold">
              ✓ Your subscription is active until {new Date(user.subscription_expiry).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">
              ✗ Your subscription has expired. Renew to accept calls and messages.
            </p>
            <a href="/subscription" className="text-red-600 hover:underline text-sm">
              Renew subscription →
            </a>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("qr")}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "qr"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Your QR Code
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors relative ${
              activeTab === "messages"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Messages {messages.length > 0 && <span className="ml-2 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">{messages.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("calls")}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors relative ${
              activeTab === "calls"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Call Logs {callLogs.length > 0 && <span className="ml-2 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">{callLogs.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Profile
          </button>
        </div>

        {/* QR Code Tab */}
        {activeTab === "qr" && (
          <div className="bg-white rounded-lg p-8 mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your SafeTag QR Code</h2>
            <p className="text-gray-600 mb-6">Share this QR code on your car. When scanned, people can contact you.</p>
            <div className="inline-block bg-gray-100 p-6 rounded-lg mb-6">
              <QRCode value={qrUrl} size={256} level="H" includeMargin={true} />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">QR Code URL:</p>
              <code className="text-sm bg-white border border-gray-200 rounded p-2 block break-all">{qrUrl}</code>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Messages</h2>
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No messages yet</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-gray-900">
                        {msg.sender?.full_name || "Anonymous"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-gray-700">{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-2">Status: {msg.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call Logs Tab */}
        {activeTab === "calls" && (
          <div className="bg-white rounded-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Call History</h2>
            {callLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No calls yet</p>
            ) : (
              <div className="space-y-4">
                {callLogs.map((call, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Call from {call.caller?.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Call SID: {call.call_sid}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(call.created_at).toLocaleDateString()}
                        </p>
                        <span className={`inline-block mt-1 px-3 py-1 rounded text-xs font-semibold ${
                          call.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {call.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-semibold text-gray-900">{user.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Car Number</p>
                <p className="font-semibold text-gray-900">{user.car_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="font-semibold text-gray-900">{user.phone_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emergency Contact</p>
                <p className="font-semibold text-gray-900">{user.emergency_contact_name} - {user.emergency_contact_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subscription Status</p>
                <p className={`font-semibold ${isSubscriptionActive ? "text-emerald-600" : "text-red-600"}`}>
                  {isSubscriptionActive ? "Active" : "Expired"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
