import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NextGen Flow Pro - AI Video Generation Platform',
  description:
    'Create stunning AI-powered videos with NextGen Flow Pro. Text to video, image to video, and more. Premium AI video generation platform.',
  keywords: ['AI video', 'video generation', 'text to video', 'AI', 'video creation'],
  openGraph: {
    title: 'NextGen Flow Pro - AI Video Generation Platform',
    description: 'Create stunning AI-powered videos with NextGen Flow Pro.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NextGen Flow Pro - AI Video Generation Platform',
    description: 'Create stunning AI-powered videos with NextGen Flow Pro.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ToastProvider />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
