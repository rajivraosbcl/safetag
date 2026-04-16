import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { supabase } from "@/app/lib/supabase"

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
        expected: generatedSignature,
        received: signature,
      })
      return NextResponse.json(
        { error: "Invalid payment signature. Payment verification failed." },
        { status: 403 }
      )
    }

    // Calculate subscription expiry based on plan
    const expiryDate = new Date()
    if (plan === "annual") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    }   updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()

    if (error) {
      console.error("Database update error:", error)
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 }
      )
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount: plan === "annual" ? 99900 : 10000,
        currency: "INR",
        plan: plan,
        status: "success",
        created_at: new Date().toISOString(),
      })

    if (paymentError) {
      console.error("Payment record error:", paymentError)
      // Don't fail here, subscription is already updated
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
|| "Payment verification failed" 
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
