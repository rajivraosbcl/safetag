import { NextResponse } from "next/server"

export async function POST() {
  try {
    const keyId = "rzp_test_SeF09poqTsSqrV"
    const keySecret = "jV2MZ6g6bqwv7Cxo20BW197x"

    console.log("Key ID:", keyId)
    console.log("Key Secret exists:", !!keySecret)

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
      },
      body: JSON.stringify({
        amount: 99900,
        currency: "INR",
        receipt: "safetag_" + Date.now(),
      }),
    })

    const order = await response.json()
    console.log("Razorpay response:", JSON.stringify(order))
    return NextResponse.json(order)

  } catch (err: any) {
    console.log("Error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}