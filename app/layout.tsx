import type { Metadata } from 'next'
import { Inter, Press_Start_2P } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const pixelFont = Press_Start_2P({ 
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel'
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
