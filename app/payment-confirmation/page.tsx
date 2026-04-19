"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function PaymentConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderId = searchParams.get("razorpay_order_id")
        const paymentId = searchParams.get("razorpay_payment_id")
        const signature = searchParams.get("razorpay_signature")
        const userId = localStorage.getItem("userId")
        const plan = localStorage.getItem("selectedPlan")

        if (!orderId || !paymentId || !signature || !userId || !plan) {
          setStatus("error")
          setMessage("Missing payment information. Please try again.")
          return
        }

        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentId,
            signature,
            userId,
            plan,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setStatus("error")
          setMessage(data.error || "Payment verification failed")
          return
        }

        setStatus("success")
        setMessage("Your subscription is now active!")
        localStorage.removeItem("userId")
        localStorage.removeItem("selectedPlan")

        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)
      } catch (err: any) {
        setStatus("error")
        setMessage("Error verifying payment: " + err.message)
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-emerald-600 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard in 3 seconds...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push("/signup")}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-emerald-700"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </main>
  )
}

export default function PaymentConfirmation() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <PaymentConfirmationContent />
    </Suspense>
  )
}
