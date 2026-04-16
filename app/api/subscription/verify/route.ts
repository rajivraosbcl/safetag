import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/app/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("subscription_status, subscription_expiry, subscription_plan")
      .eq("id", userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const isActive =
      user.subscription_status === "active" &&
      new Date(user.subscription_expiry) > new Date()

    return NextResponse.json({
      isActive,
      status: user.subscription_status,
      expiryDate: user.subscription_expiry,
      plan: user.subscription_plan,
    })
  } catch (error: any) {
    console.error("Subscription verification error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
