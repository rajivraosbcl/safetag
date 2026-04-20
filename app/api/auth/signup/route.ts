import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Service role client: bypasses RLS and can create confirmed auth users.
// IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must be set in your Vercel env vars.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set" },
        { status: 500 }
      )
    }

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
    } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // 1. Create the auth user server-side with admin.createUser.
    //    - email_confirm: true skips the confirmation email flow, which means
    //      the row in auth.users is fully committed immediately.
    //    - Using admin.createUser (instead of the client's signUp) avoids
    //      Supabase's "obfuscated user id on duplicate email" behavior that
    //      was causing the users_id_fkey foreign-key violation.
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      })

    if (createErr || !created?.user) {
      // Friendly message for the common "already registered" case.
      const msg = createErr?.message || "Failed to create user"
      const isDuplicate = /already|exists|registered/i.test(msg)
      return NextResponse.json(
        { error: isDuplicate ? "An account with this email already exists. Please sign in instead." : msg },
        { status: isDuplicate ? 409 : 400 }
      )
    }

    const userId = created.user.id

    // 2. Upsert the profile row in public.users. Upsert (not insert) handles
    //    the case where a DB trigger has already inserted a stub row.
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
          subscription_status: "pending",
        },
        { onConflict: "id" }
      )

    if (userError) {
      console.error("Profile upsert error:", userError)
      // Roll back the auth user we just created so the user can retry cleanly.
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    // 3. Return the real userId so the client can use it for payment, etc.
    return NextResponse.json({ success: true, userId })
  } catch (err: any) {
    console.error("Signup API error:", err)
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
