import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GameVault Pro | AAA Game Guides & Walkthroughs',
    template: '%s | GameVault Pro',
  },
  description:
    'Your ultimate destination for AAA game guides, walkthroughs, boss strategies, and pro tips. Expert-crafted content for Elden Ring, Baldur\'s Gate 3, Final Fantasy XVI, and more.',
  keywords: [
    'game guides',
    'walkthroughs',
    'boss strategies',
    'AAA games',
    'Elden Ring guide',
    'Baldur\'s Gate 3',
    'Final Fantasy XVI',
    'God of War Ragnarok',
    'game tips',
    'pro gaming guides',
  ],
  authors: [{ name: 'GameVault Pro', url: 'https://gamevault.pro' }],
  generator: 'GameVault Pro',
  openGraph: {
    title: 'GameVault Pro | AAA Game Guides & Walkthroughs',
    description:
      'Expert-crafted game guides for the biggest AAA titles. Boss strategies, build guides, and pro tips updated daily.',
    locale: 'en_US',
    type: 'website',
    siteName: 'GameVault Pro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameVault Pro | AAA Game Guides',
    description:
      'Expert-crafted game guides for the biggest AAA titles.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Inspector />
        {children}
      </body>
    </html>
  );
}
