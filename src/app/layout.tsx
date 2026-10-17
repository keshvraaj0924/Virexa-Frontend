import { ProductGuide } from '@/components/guide/product-guide'
import './product-guide.css'
import type { Metadata } from 'next'
import './globals.css'
import './marketing.css'
import './premium-marketing.css'
import './auth.css'
import './premium-auth.css'
import './app-shell.css'
import './premium-workspace.css'

export const metadata: Metadata = {
  title: 'Virexa — Beyond Automation',
  description: 'Enterprise operations automation platform.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<ProductGuide /></body>
    </html>
  )
}

