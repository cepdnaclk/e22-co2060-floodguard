import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'FloodGuard Dashboard',
  description: 'Reservoir Flood Early-Warning Decision Support System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
