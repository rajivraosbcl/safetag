import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeTag",
  description: "India's privacy-first car contact system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}