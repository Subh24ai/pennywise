import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PennyWise - LLM Cost Optimizer',
  description: 'Reduce LLM costs by 70% with automatic optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}