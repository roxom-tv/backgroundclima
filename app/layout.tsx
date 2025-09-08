import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const pixelFont = localFont({
  src: '../public/VCR_OSD_MONO_1.001.ttf',
  variable: '--font-pixel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ROXOM.TV - Live City Views',
  description: 'Live YouTube streams from cities around the world with real-time weather information',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${pixelFont.variable}`}>
        {children}
      </body>
    </html>
  )
}
