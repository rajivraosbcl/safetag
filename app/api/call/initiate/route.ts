import { NextRequest, NextResponse } from "next/server"
import { initiateCall } from "@/app/lib/twilio"
import { supabase } from "@/app/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driverId, userId } = body

    // Verify user's subscription is active
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_status, subscription_expiry")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check subscription status
    const isSubscriptionActive = 
      user.subscription_status === "active" &&
      new Date(user.subscription_expiry) > new Date()

    if (!isSubscriptionActive) {
      return NextResponse.json(
        { error: "Active subscription required to make calls" },
        { status: 403 }
      )
    }

    // Get driver's phone number
    const { data: driver, error: driverError } = await supabase
      .from("users")
      .select("phone_number")
      .eq("id", driverId)
      .single()

    if (driverError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    // Initiate call
    const result = await initiateCall(driver.phone_number)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Log the call attempt
    await supabase.from("call_logs").insert({
      caller_id: userId,
      driver_id: driverId,
      call_sid: result.callSid,
      status: result.status,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      callSid: result.callSid,
      message: "Call initiated successfully",
    })
  } catch (error: any) {
    console.error("Call initiation error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
