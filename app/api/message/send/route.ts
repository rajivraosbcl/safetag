import { NextRequest, NextResponse } from "next/server"
import { sendSMS } from "@/app/lib/twilio"
import { supabase } from "@/app/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driverId, userId, message } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      )
    }

    // Get driver's phone number
    const { data: driver, error: driverError } = await supabase
      .from("users")
      .select("phone_number, car_number")
      .eq("id", driverId)
      .single()

    if (driverError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    // Get sender's name
    const { data: sender, error: senderError } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single()

    if (senderError || !sender) {
      return NextResponse.json(
        { error: "Sender not found" },
        { status: 404 }
      )
    }

    // Send SMS with sender info
    const fullMessage = `SafeTag: ${sender.full_name} sent a message: "${message}"`
    const result = await sendSMS(driver.phone_number, fullMessage)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Store message in database
    await supabase.from("messages").insert({
      sender_id: userId,
      driver_id: driverId,
      message: message,
      message_sid: result.messageSid,
      status: result.status,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      messageSid: result.messageSid,
      message: "Message sent successfully",
    })
  } catch (error: any) {
    console.error("Message sending error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
