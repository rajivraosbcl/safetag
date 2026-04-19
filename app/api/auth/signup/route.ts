import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Use service role key (can bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      password,
      full_name,
      phone_number,
      car_number,
      rc_file_path,
      emergency_contact_name,
      emergency_contact_phone,
      userId,
    } = body

    console.log("Signup API received:", { userId, email, full_name })

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      )
    }

    // Insert user profile with service role (bypasses RLS)
    const { error: userError, data } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        full_name,
        email,
        phone_number,
        car_number: car_number.toUpperCase(),
        rc_file_path,
        emergency_contact_name,
        emergency_contact_phone,
        user_type: "driver",
        subscription_status: "pending",
      })

    if (userError) {
      console.error("Insert error:", userError)
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    console.log("User inserted successfully:", data)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Signup API error:", err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
