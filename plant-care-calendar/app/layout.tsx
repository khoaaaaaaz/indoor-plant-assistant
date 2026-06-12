import type { Metadata } from 'next'
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _newsreader = Newsreader({ 
  subsets: ["latin"],
  variable: '--font-headline'
});
const _plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'Plant Care Calendar | Beautiful Plant Care Tracking',
  description: 'Track your plant care routine with a beautiful, interactive calendar. Schedule watering, misting, and fertilizing for your indoor plants.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${_newsreader.variable} ${_plusJakarta.variable}`}>
      <body className="bg-background font-body text-foreground antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
