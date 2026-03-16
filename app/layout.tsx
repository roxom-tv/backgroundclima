import type { Metadata } from 'next'
import { Inter, Fira_Code, Fira_Sans } from 'next/font/google'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const firaCode = Fira_Code({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-fira-code' })
const firaSans = Fira_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-fira-sans' })
const pixelFont = localFont({
  src: './VCR_OSD_MONO_1.001.ttf',
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
      <body className={`${inter.className} ${pixelFont.variable} ${firaCode.variable} ${firaSans.variable}`}>
        <Script
          src="https://kit.fontawesome.com/090ca49637.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  )
}
