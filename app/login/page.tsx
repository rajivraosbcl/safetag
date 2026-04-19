"use client"
import { useState } from "react"
import { supabase } from "@/app/lib/supabase"
import { useRouter } from "next/navigation"

export default function Login() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"input" | "otp">("input")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSendOTP = async () => {
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (!phone) {
        setError("Please enter a phone number")
        setLoading(false)
        return
      }

      // Format phone number
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`

      // Sign in with OTP
      const { error: signInError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })

      if (signInError) {
        setError(signInError.message || "Failed to send OTP")
        return
      }

      setSuccessMessage("OTP sent to your phone number")
      setStep("otp")
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (!otp || otp.length < 6) {
        setError("Please enter a valid OTP")
        setLoading(false)
        return
      }

      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      })

      if (verifyError) {
        setError(verifyError.message || "Invalid OTP")
        return
      }

      setSuccessMessage("Login successful! Redirecting...")
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (err: any) {
      setError(err.message || "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (!email || !password) {
        setError("Please enter email and password")
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (signInError) {
        setError(signInError.message || "Login failed")
        return
      }

      setSuccessMessage("Login successful! Redirecting...")
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (err: any) {
      setError(err.message || "An error occurred")
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
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </a>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm">

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your SafeTag account</p>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 mb-6">
            <button 
              onClick={() => {
                setLoginMethod("phone")
                setStep("input")
                setError("")
                setOtp("")
              }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                loginMethod === "phone"
                  ? "text-emerald-600 border-emerald-600"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              Phone
            </button>
            <button 
              onClick={() => {
                setLoginMethod("email")
                setStep("input")
                setError("")
              }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                loginMethod === "email"
                  ? "text-emerald-600 border-emerald-600"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              Email
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-emerald-700 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Phone login */}
          {loginMethod === "phone" && (
            <div className="flex flex-col gap-4">
              {step === "input" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mobile number</label>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-50"
                    />
                  </div>
                  <button 
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-400"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </>
              )}

              {step === "otp" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Enter OTP</label>
                    <input
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={loading}
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-50 text-center font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-2">OTP sent to +91-{phone.slice(-10)}</p>
                  </div>
                  <button 
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-400"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button 
                    onClick={() => setStep("input")}
                    disabled={loading}
                    className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Change Number
                  </button>
                </>
              )}
            </div>
          )}

          {/* Email login */}
          {loginMethod === "email" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-50"
                />
              </div>
              <button 
                onClick={handleEmailLogin}
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-400"
              >
                {loading ? "Logging in..." : "Sign In"}
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{" "}
            <a href="/signup" className="text-emerald-600 hover:underline">
              Sign up
            </a>
          </p>

        </div>
      </div>

    </main>
  )
}