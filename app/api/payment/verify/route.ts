import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

// Service-role client: bypasses RLS so we can update the users row and insert
// into payments without needing an authenticated session. This route is hit
// from the Razorpay redirect flow (payment-confirmation page), where the user
// may not yet have an active session client-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
      return NextResponse.json(
        { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { orderId, paymentId, signature, userId, plan } = body

    if (!orderId || !paymentId || !signature || !userId || !plan) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify Razorpay signature.
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      console.error("Missing RAZORPAY_KEY_SECRET environment variable")
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      )
    }

    const message = `${orderId}|${paymentId}`
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(message)
      .digest("hex")

    if (generatedSignature !== signature) {
      console.error("Signature verification failed", {
        orderId,
        paymentId,
      })
      return NextResponse.json(
        { error: "Invalid payment signature. Payment verification failed." },
        { status: 403 }
      )
    }

    // Calculate subscription expiry based on plan.
    const expiryDate = new Date()
    if (plan === "annual") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    } else if (plan === "monthly") {
      expiryDate.setMonth(expiryDate.getMonth() + 1)
    }

    // Update the user's subscription. Write BOTH the legacy column names
    // (subscription_expiry, subscription_start_date) and the new ones
    // (subscription_expires_at, subscription_started_at) so reads from either
    // schema generation will see the active subscription.
    const nowIso = new Date().toISOString()
    const expiryIso = expiryDate.toISOString()

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "active",
        subscription_plan: plan,
        subscription_expiry: expiryIso,
        subscription_expires_at: expiryIso,
        subscription_start_date: nowIso,
        subscription_started_at: nowIso,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        updated_at: nowIso,
      })
      .eq("id", userId)
      .select()

    if (error) {
      console.error("Database update error:", error)
      return NextResponse.json(
        { error: `Failed to activate subscription: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      // No row matched — likely a stale userId or the user was never created.
      console.error("Payment verify: no user row matched id", userId)
      return NextResponse.json(
        { error: "User not found for this payment" },
        { status: 404 }
      )
    }

    // Record the payment.
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount: plan === "annual" ? 99900 : 10000,
        currency: "INR",
        plan: plan,
        status: "success",
        created_at: nowIso,
      })

    if (paymentError) {
      // Subscription is already activated; log but don't fail the request.
      console.error("Payment record insert failed (non-fatal):", paymentError)
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated",
      user: data[0],
    })
  } catch (error: any) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
