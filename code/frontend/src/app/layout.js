import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono' })

export const metadata = {
  title: 'Adaptive Dam Reservoir Management System',
  description: 'Reservoir Flood Early-Warning Decision Support System',
}

export default function RootLayout({ children }) {
  // --------------------------------------------------------
  // Root Layout wrapper
  // 1. Injects global fonts (Inter for sans, Plex Mono for monospace)
  // 2. Wraps the app in a dark-mode ThemeProvider
  // 3. Mounts the global Navbar across all routes
  // --------------------------------------------------------
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body className={inter.className}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          <Navbar />
          <main className="container">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
