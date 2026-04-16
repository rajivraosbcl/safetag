import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan = "annual" } = body

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error("Missing Razorpay credentials in environment")
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      )
    }

    // Determine amount based on plan
    const amount = plan === "annual" ? 99900 : 10000

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
      },
      body: JSON.stringify({
        amount: amount,
        currency: "INR",
        receipt: "safetag_" + Date.now(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Razorpay API error:", errorData)
      return NextResponse.json(
        { error: errorData.description || "Failed to create order" },
        { status: response.status }
      )
    }

    const order = await response.json()
    console.log("Razorpay order created:", order.id)
    return NextResponse.json(order)

  } catch (err: any) {
    console.error("Order creation error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to create order" },
      { status: 500 }
    )
  }
}