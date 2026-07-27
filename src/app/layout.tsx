import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Pixelify_Sans } from 'next/font/google';
import { Header } from '@/components/Header/Header';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const pixelify = Pixelify_Sans({
  subsets: ['latin'],
  variable: '--font-pixel',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SPARK LAB — Think. Build. Ship.',
  description:
    'Personal site of Spark — independent developer building digital products, experimenting with AI, and designing interaction systems.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${pixelify.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
