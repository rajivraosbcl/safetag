"use client"
import { useState } from "react"

export default function Signup() {
  const [step, setStep] = useState(1)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <a href="/" className="text-xl font-semibold">
          Safe<span className="text-emerald-600">Tag</span>
        </a>
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </a>
      </nav>

      {/* Form */}
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
                  s === step
                    ? "w-8 bg-emerald-600"
                    : s < step
                    ? "w-4 bg-emerald-300"
                    : "w-4 bg-gray-200"
                }`}
              />
            ))}
            <span className="text-xs text-gray-400 ml-2">Step {step} of 3</span>
          </div>

          {/* Step 1 — Personal details */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full name</label>
                <input
                  type="text"
                  placeholder="Arjun Sharma"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mobile number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 mt-2"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — Car details */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Car registration number</label>
                <input
                  type="text"
                  placeholder="TS 09 EF 1234"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">RC copy (image or PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emergency contact name</label>
                <input
                  type="text"
                  placeholder="Priya Sharma"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emergency contact number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43211"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Payment */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Annual subscription</p>
                <p className="text-3xl font-semibold text-gray-900">
                  ₹999
                  <span className="text-sm font-normal text-gray-400"> / year</span>
                </p>
                <ul className="mt-3 flex flex-col gap-1">
                  {[
                    "Masked call routing",
                    "SMS messaging",
                    "QR sticker by post",
                    "1 car covered",
                  ].map((item) => (
                    <li key={item} className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                  Pay ₹999
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Secure payment via Razorpay · UPI, cards, netbanking
              </p>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-emerald-600 hover:underline">
              Sign in
            </a>
          </p>

        </div>
      </div>

    </main>
  )
}