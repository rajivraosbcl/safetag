import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SafeTag",
  description: "India's privacy-first car contact system",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        ></script>
      </head>
      <body>{children}</body>
    </html>
  )
}