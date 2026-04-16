import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/app/lib/supabase"

const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, paymentId, signature, userId, plan } = body

    if (!orderId || !paymentId || !signature || !userId || !plan) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify signature
    const crypto = require("crypto")
    const message = `${orderId}|${paymentId}`
    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(message)
      .digest("hex")

    if (generatedSignature !== signature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      )
    }

    // Calculate subscription expiry based on plan
    const expiryDate = new Date()
    if (plan === "annual") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    } else if (plan === "monthly") {
      expiryDate.setMonth(expiryDate.getMonth() + 1)
    }

    // Update user subscription in database
    const { data, error } = await supabase
      .from("users")
      .update({
        subscription_status: "active",
        subscription_expiry: expiryDate.toISOString(),
        subscription_plan: plan,
        subscription_start_date: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()

    if (error) {
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      )
    }

    // Create payment record
    await supabase.from("payments").insert({
      user_id: userId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      amount: plan === "annual" ? 99900 : 10000,
      currency: "INR",
      plan: plan,
      status: "success",
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated",
      user: data,
    })
  } catch (error: any) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
