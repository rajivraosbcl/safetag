"use client"
import { useEffect } from "react"
import { supabase } from "@/app/lib/supabase"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  // Check if user is authenticated and redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
      }
    }
    checkAuth()
  }, [router])

  return (
    <main className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="text-xl font-semibold">
          Safe<span className="text-emerald-600">Tag</span>
        </div>
        <div className="flex gap-3">
          <a href="/login" className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Log in
          </a>
          <a href="/signup" className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Get started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto text-center px-6 py-20">
        <div className="inline-block bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full mb-5">
          India's privacy-first car contact system
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 leading-tight mb-5">
          Get contacted without revealing your number
        </h1>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          Stick a SafeTag QR on your car. Anyone can reach you instantly — calls go through our masked line, your number stays private.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/signup" className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            Register your car
          </a>
          <a href="/login" className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            Sign in
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg mb-4 flex items-center justify-center text-emerald-700 text-lg">
            ▦
          </div>
          <h3 className="font-medium text-gray-900 mb-2">QR sticker on your car</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            We mail you a weatherproof sticker after signup.
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg mb-4 flex items-center justify-center text-blue-700 text-lg">
            ☎
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Masked call or message</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Caller dials our central number. You receive it. No number shared.
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg mb-4 flex items-center justify-center text-amber-700 text-lg">
            ✦
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Annual subscription</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            One plan. Active subscription unlocks calls instantly.
          </p>
        </div>
      </section>

    </main>
  )
}