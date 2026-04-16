import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn("Twilio credentials not configured")
}

const client = twilio(accountSid, authToken)

export const initiateCall = async (driverPhoneNumber: string) => {
  try {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error("Twilio not configured")
    }

    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: driverPhoneNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/twiml`,
    })

    return {
      success: true,
      callSid: call.sid,
      status: call.status,
    }
  } catch (error: any) {
    console.error("Error initiating call:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export const sendSMS = async (phoneNumber: string, message: string) => {
  try {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error("Twilio not configured")
    }

    const sms = await client.messages.create({
      from: twilioPhoneNumber,
      to: phoneNumber,
      body: message,
    })

    return {
      success: true,
      messageSid: sms.sid,
      status: sms.status,
    }
  } catch (error: any) {
    console.error("Error sending SMS:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}
