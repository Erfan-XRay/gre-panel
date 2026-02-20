import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'GRE Panel | Network Operations',
  description: 'Premium dashboard for GRE & VXLAN Tunnel Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <div className="ambient-bg"></div>
        {children}
      </body>
    </html>
  )
}
