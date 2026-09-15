import type { Metadata } from 'next'
import './globals.css'
import './marketing.css'
import './auth.css'
import './app-shell.css'

export const metadata: Metadata = {
  title: 'Virexa — Beyond Automation',
  description: 'Enterprise operations automation platform.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
