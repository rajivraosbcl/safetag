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

  const handleSignup = async () => {
    setLoading(true)
    setError("")

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      const userId = authData.user!.id

      // 2. Upload RC file
      let rcUrl = ""
      if (formData.rc_file) {
        const fileExt = (formData.rc_file as any).name.split(".").pop()
        const fileName = `${userId}/rc.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("rc-documents")
          .upload(fileName, formData.rc_file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("rc-documents")
            .getPublicUrl(fileName)
          rcUrl = urlData.publicUrl
        }
      }

      // 3. Save user profile with car info
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: userId,
          full_name: formData.full_name,
          phone_number: formData.phone,
          email: formData.email,
          car_number: formData.car_number.toUpperCase(),
          rc_file_path: rcUrl,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          user_type: "driver",
          subscription_status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (userError) throw userError

      // 4. Store user ID and plan for payment verification
      localStorage.setItem("userId", userId)
      localStorage.setItem("selectedPlan", "annual")

      // 5. Create Razorpay order
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

      // 6. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "SafeTag",
        description: "Annual Subscription",
        order_id: order.id,
        handler: async function (response: any) {
          // Verify payment on backend
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                userId: userId,
                plan: "annual",
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed")
            }

            localStorage.removeItem("userId")
            localStorage.removeItem("selectedPlan")
            alert("Payment successful! Welcome to SafeTag!")
            window.location.href = "/dashboard"
          } catch (err: any) {
            alert("Payment received but verification failed. Please contact support.")
            console.error("Verification error:", err)
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