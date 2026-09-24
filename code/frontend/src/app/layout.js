import { Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import AppLayout from '@/components/AppLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'FloodGuard — Reservoir Early-Warning Decision Support System',
  description: 'National Dam Safety and Reservoir Flood Management Decision Support System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body className={inter.className}>
        <AppProvider>
          <AppLayout>{children}</AppLayout>
        </AppProvider>
      </body>
    </html>
  );
}
