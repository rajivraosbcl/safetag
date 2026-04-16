import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const twiml = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  try {
    const response = new twiml()

    // Simple greeting and hangup
    response.say({
      voice: "alice",
    }, "Thank you for calling SafeTag. Your call has been connected to the driver. If the driver does not answer, please try again later.")

    response.hangup()

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    })
  } catch (error: any) {
    console.error("TwiML error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
