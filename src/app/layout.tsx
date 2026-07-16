import type { Metadata } from 'next';
import { Inter, Pixelify_Sans, JetBrains_Mono } from 'next/font/google';
import { Header } from '@/components/Header/Header';
import { PixelStage } from '@/features/pixel/PixelStage';
import './globals.css';

/**
 * 字体策略：
 * - Inter：正文，可读性极佳的现代无衬线
 * - Pixelify Sans：大标题，像素点阵风格
 * - JetBrains Mono：元数据/代码，等宽字体
 */
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
        {/* 全局唯一 Fixed Canvas */}
        <PixelStage />
        {children}
      </body>
    </html>
  );
}
