import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import '@arcgis/core/assets/esri/themes/light/main.css'
import Navigation from './components/Navigation'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FireWatch - Forest Fire Monitor',
  description: 'Disaster monitoring system using NASA FIRMS data',
  keywords: ['fire', 'monitoring', 'NASA', 'FIRMS', 'wildfire', 'satellite'],
  authors: [{ name: 'FireWatch' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950`}
      >
        <Navigation />
        {children}
      </body>
    </html>
  )
}
