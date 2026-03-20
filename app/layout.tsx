import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import Topbar from '@/components/Topbar'

export const metadata: Metadata = {
  title: 'Kukui',
  description: 'Sistema de gestión de pedidos — Kukui',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppProvider>
          <div className="shell">
            <Topbar />
            <main>{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
