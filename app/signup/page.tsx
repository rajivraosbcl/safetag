"use client"
import { useState } from "react"
import { supabase } from "../lib/supabase"


const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Signup() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    car_number: "",
    rc_file: null,
  })

  const handleChange = (e: any) => {
    if (e.target.type === "file") {
      setFormData({ ...formData, rc_file: e.target.files[0] })
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }

  const handleStep1 = () => {
    if (!formData.full_name || !formData.phone || !formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    setError("")
    setStep(2)
  }

  const handleStep2 = () => {
    if (!formData.car_number || !formData.emergency_contact_name || !formData.emergency_contact_phone) {
      setError("Please fill in all fields")
      return
    }
    setError("")
    setStep(3)
  }

  // Read a File as a base64 data URL (without the prefix).
  const fileToBase64 = (file: File): Promise<{ data: string; mime: string; ext: string; name: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => {
        const result = reader.result as string
        const comma = result.indexOf(",")
        resolve({
          data: comma >= 0 ? result.slice(comma + 1) : result,
          mime: file.type || "application/octet-stream",
          ext: file.name.split(".").pop() || "bin",
          name: file.name,
        })
      }
      reader.readAsDataURL(file)
    })

  const handleSignup = async () => {
    setLoading(true)
    setError("")

    try {
      // 1. Pre-payment validation only. This call does NOT create an auth
      //    user or a profile row. It just verifies that the email is free
      //    and the password is long enough, so we don't send the user to
      //    Razorpay only to fail afterwards. Account creation is deferred
      //    until /api/auth/finalize-signup runs AFTER a successful payment.
      const validateRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })
      const validateData = await validateRes.json()
      if (!validateRes.ok) {
        throw new Error(validateData.error || "Validation failed")
      }

      // 2. Pre-read the RC file (optional) into base64 so we can upload it
      //    server-side after the account is created. Doing this BEFORE
      //    opening Razorpay means the file contents are safely in memory
      //    even if the modal takes a while.
      let rcPayload: { data: string; mime: string; ext: string; name: string } | null = null
      if (formData.rc_file) {
        rcPayload = await fileToBase64(formData.rc_file as File)
      }

      // 3. Create Razorpay order.
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "annual" }),
      })
      if (!orderRes.ok) {
        const errorData = await orderRes.json()
        throw new Error(errorData.error || "Failed to create payment order")
      }
      const order = await orderRes.json()
      if (!order.id) {
        throw new Error("Invalid order response from payment service")
      }

      // 4. Open Razorpay checkout. The signup + profile row are only
      //    created inside the `handler` below, AFTER payment succeeds.
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "SafeTag",
        description: "Annual Subscription",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            setLoading(true)
            // Finalize: verify payment + create auth user + create profile.
            const finalizeRes = await fetch("/api/auth/finalize-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan: "annual",
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                phone_number: formData.phone,
                car_number: formData.car_number.toUpperCase(),
                emergency_contact_name: formData.emergency_contact_name,
                emergency_contact_phone: formData.emergency_contact_phone,
                rc_file: rcPayload,
              }),
            })
            const finalizeData = await finalizeRes.json()
            if (!finalizeRes.ok) {
              throw new Error(finalizeData.error || "Failed to finalize signup")
            }

            const userId: string = finalizeData.userId

            // Sign the user in on the client so the dashboard has a session.
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            })
            if (signInError) throw signInError

            localStorage.setItem("userId", userId)
            alert("Payment successful! Welcome to SafeTag!")
            window.location.href = "/dashboard"
          } catch (err: any) {
            console.error("Finalize error:", err)
            const reason = err?.message || "Unknown error"
            alert(
              `Payment received but account creation failed.\n\nReason: ${reason}\n\nPlease contact support with this order id: ${order.id}`
            )
            setError(`Account creation failed: ${reason}`)
            setLoading(false)
          }
        },
        prefill: {
          name: formData.full_name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#059669",
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
            setError('Payment cancelled. Please try again.')
          },
        },
      }

      const loaded = await loadRazorpay()
      if (!loaded) {
        throw new Error('Razorpay failed to load. Check your internet connection.')
      }
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error('Payment service not configured. Please contact support.')
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        setLoading(false)
        setError(`Payment failed: ${response.error.description}`)
      })
      rzp.open()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <a href="/" className="text-xl font-semibold">
          Safe<span className="text-emerald-600">Tag</span>
        </a>
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back</a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm">

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">Register your car on SafeTag</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-8 bg-emerald-600"
                  : s < step ? "w-4 bg-emerald-300"
                  : "w-4 bg-gray-200"
                }`}
              />
            ))}
            <span className="text-xs text-gray-400 ml-2">Step {step} of 3</span>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full name</label>
                <input name="full_name" type="text" placeholder="Arjun Sharma"
                  value={formData.full_name} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mobile number</label>
                <input name="phone" type="tel" placeholder="+91 98765 43210"
                  value={formData.phone} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email address</label>
                <input name="email" type="email" placeholder="you@example.com"
                  value={formData.email} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <input name="password" type="password" placeholder="••••••••"
                  value={formData.password} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
              </div>              <button onClick={handleStep1}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 mt-2">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Car registration number</label>
                <input name="car_number" type="text" placeholder="TS 09 EF 1234"
                  value={formData.car_number} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">RC copy (image or PDF)</label>
                <input name="rc_file" type="file" accept="image/*,.pdf"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emergency contact name</label>
                <input name="emergency_contact_name" type="text" placeholder="Priya Sharma"
                  value={formData.emergency_contact_name} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emergency contact number</label>
                <input name="emergency_contact_phone" type="tel" placeholder="+91 98765 43211"
                  value={formData.emergency_contact_phone} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={handleStep2}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Payment */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Annual subscription</p>
                <p className="text-3xl font-semibold text-gray-900">
                  ₹999 <span className="text-sm font-normal text-gray-400">/ year</span>
                </p>
                <ul className="mt-3 flex flex-col gap-1">
                  {["Masked call routing", "SMS messaging", "QR sticker by post", "1 car covered"].map((item) => (
                    <li key={item} className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Pay ₹999"}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Secure payment via Razorpay · UPI, cards, netbanking
              </p>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-emerald-600 hover:underline">Sign in</a>
          </p>

        </div>
      </div>
    </main>
  )
}