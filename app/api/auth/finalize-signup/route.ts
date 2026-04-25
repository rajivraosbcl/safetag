import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// Service role client: bypasses RLS and can create confirmed auth users.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

/**
 * Finalize signup AFTER Razorpay payment succeeds.
 *
 * This is the ONLY endpoint that creates a user or profile row for a paying
 * signup. The pre-payment /api/auth/signup route now only validates and
 * reserves nothing — so if a user abandons at the payment step, there is no
 * orphan auth user and no orphan profile row.
 *
 * Flow:
 *   1. Verify Razorpay signature (HMAC-SHA256 of "order_id|payment_id").
 *   2. Create the auth user with admin.createUser(email_confirm: true).
 *   3. Upsert the profile row with subscription_status = "active".
 *   4. On any failure after step 2, roll back the auth user.
 */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set" },
        { status: 500 }
      )
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Server misconfigured: RAZORPAY_KEY_SECRET is not set" },
        { status: 500 }
      )
    }

    const body = await req.json()
    const {
      // Razorpay fields
      orderId,
      paymentId,
      signature,
      // Signup fields
      email,
      password,
      full_name,
      phone_number,
      car_number,
      rc_file, // { data: base64, mime, ext, name } or null
      emergency_contact_name,
      emergency_contact_phone,
      plan,
    } = body as {
      orderId?: string
      paymentId?: string
      signature?: string
      email?: string
      password?: string
      full_name?: string
      phone_number?: string
      car_number?: string
      rc_file?: { data: string; mime: string; ext: string; name: string } | null
      emergency_contact_name?: string
      emergency_contact_phone?: string
      plan?: string
    }
    let rc_file_path: string | null = null

    // --- 1. Verify Razorpay signature ------------------------------------
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      )
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    if (expected !== signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      )
    }

    // --- 2. Validate required signup data -------------------------------
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // --- 3. Create the auth user ----------------------------------------
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      })

    if (createErr || !created?.user) {
      const msg = createErr?.message || "Failed to create user"
      const isDuplicate = /already|exists|registered/i.test(msg)
      return NextResponse.json(
        {
          error: isDuplicate
            ? "An account with this email already exists. Please sign in instead. Your payment has been captured — contact support to resolve."
            : msg,
        },
        { status: isDuplicate ? 409 : 400 }
      )
    }

    const userId = created.user.id

    // --- 3b. Upload RC file (optional) using the service role -----------
    if (rc_file?.data) {
      try {
        const bytes = Buffer.from(rc_file.data, "base64")
        const ext = (rc_file.ext || "bin").replace(/[^a-zA-Z0-9]/g, "") || "bin"
        const path = `${userId}/rc.${ext}`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("rc-documents")
          .upload(path, bytes, {
            contentType: rc_file.mime || "application/octet-stream",
            upsert: true,
          })
        if (uploadErr) {
          console.warn("RC upload failed (continuing):", uploadErr.message)
        } else {
          const { data: urlData } = supabaseAdmin.storage
            .from("rc-documents")
            .getPublicUrl(path)
          rc_file_path = urlData.publicUrl
        }
      } catch (e: any) {
        console.warn("RC upload threw (continuing):", e?.message)
      }
    }

    // --- 4. Upsert the profile row --------------------------------------
    const subscriptionStart = new Date()
    const subscriptionEnd = new Date(subscriptionStart)
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1)

    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: userId,
          full_name,
          email,
          phone_number,
          car_number: car_number ? car_number.toUpperCase() : null,
          rc_file_path,
          emergency_contact_name,
          emergency_contact_phone,
          user_type: "driver",
          subscription_status: "active",
          subscription_plan: plan || "annual",
          subscription_started_at: subscriptionStart.toISOString(),
          subscription_expires_at: subscriptionEnd.toISOString(),
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        },
        { onConflict: "id" }
      )

    if (userError) {
      console.error("Profile upsert error (rolling back auth user):", userError)
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    // --- 5. Record the payment in public.payments ----------------------
    // Best-effort: don't fail the signup if this insert fails (the user
    // already paid and the subscription is active on the users row).
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount: (plan || "annual") === "annual" ? 99900 : 10000,
        currency: "INR",
        plan: plan || "annual",
        status: "success",
        created_at: subscriptionStart.toISOString(),
      })

    if (paymentError) {
      console.error("Payment record insert failed (non-fatal):", paymentError)
    }

    return NextResponse.json({ success: true, userId })
  } catch (err: any) {
    console.error("finalize-signup error:", err)
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
