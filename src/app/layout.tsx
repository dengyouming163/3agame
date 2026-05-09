import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Swords, Gamepad2, Shield, Map as MapIcon, Lightbulb } from 'lucide-react';
import { MobileNav } from '@/components/mobile-nav';

export const metadata: Metadata = {
  title: {
    default: '3A Game Master | Ultimate AAA Game Guides, Boss Strategies & Walkthroughs',
    template: '%s | 3A Game Master',
  },
  description: 'The ultimate destination for AAA game guides. Boss strategies, build guides, collectible walkthroughs, and hidden secrets for Elden Ring, Baldur\'s Gate 3, Final Fantasy, God of War, and more top-tier single-player games.',
  keywords: [
    '3A game guides', 'AAA game walkthrough', 'boss strategy guide', 'best game builds',
    'hidden endings', 'collectible guides', 'Elden Ring guide', 'Baldur\'s Gate 3 guide',
    'Final Fantasy XVI guide', 'God of War Ragnarok guide', 'Cyberpunk 2077 guide',
    'Diablo IV guide', 'Resident Evil 4 guide', 'Starfield guide',
    'single player game tips', 'how to beat boss', 'all collectibles guide',
    'no damage walkthrough', 'platinum trophy guide', 'secret ending unlock',
  ],
  authors: [{ name: '3A Game Master', url: 'https://3agamemaster.com' }],
  creator: '3A Game Master',
  publisher: '3A Game Master',
  metadataBase: new URL('https://3agamemaster.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: '3A Game Master',
    title: '3A Game Master | Ultimate AAA Game Guides',
    description: 'The ultimate destination for AAA game guides, boss strategies, and walkthroughs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '3A Game Master - Ultimate AAA Game Guides',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3A Game Master | Ultimate AAA Game Guides',
    description: 'Boss strategies, build guides, and walkthroughs for top AAA games.',
    images: ['/og-image.png'],
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
  verification: {
    // Add your verification codes here when deploying
    // google: 'your-google-verification-code',
  },
};

const NAV_LINKS = [
  { href: '/guides?type=boss', label: 'Boss Guides', iconName: 'swords', color: 'text-red-400' },
  { href: '/guides?type=build', label: 'Builds', iconName: 'shield', color: 'text-cyan-400' },
  { href: '/guides?type=collectible', label: 'Collectibles', iconName: 'map', color: 'text-amber-400' },
  { href: '/guides?type=walkthrough', label: 'Walkthroughs', iconName: 'gamepad2', color: 'text-purple-400' },
  { href: '/guides?type=tips', label: 'Tips & Tricks', iconName: 'lightbulb', color: 'text-green-400' },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  swords: Swords,
  shield: Shield,
  map: MapIcon,
  gamepad2: Gamepad2,
  lightbulb: Lightbulb,
};

const MOBILE_NAV_LINKS = NAV_LINKS.map(({ href, label, iconName, color }) => ({ href, label, iconName, color }));

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '3A Game Master',
              url: 'https://3agamemaster.com',
              description: 'The ultimate destination for AAA game guides, boss strategies, build guides, and walkthroughs.',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://3agamemaster.com/guides?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
              publisher: {
                '@type': 'Organization',
                name: '3A Game Master',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://3agamemaster.com/logo.png',
                },
              },
            }),
          }}
        />
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <Swords className="h-8 w-8 text-purple-400 transition-all group-hover:text-cyan-400" />
                  <div className="absolute inset-0 blur-md bg-purple-500/20 group-hover:bg-cyan-500/20 transition-all" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-extrabold tracking-wider gradient-text font-display leading-tight">
                    3AGAME
                  </span>
                  <span className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase leading-tight">
                    MASTER
                  </span>
                </div>
              </Link>

              {/* Desktop Nav */}
	              <nav className="hidden lg:flex items-center gap-1">
	                {NAV_LINKS.map((link) => {
	                  const IconComp = ICON_MAP[link.iconName];
	                  return (
	                    <Link
	                      key={link.href}
	                      href={link.href}
	                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
	                    >
	                      {IconComp && <IconComp className={`h-4 w-4 ${link.color}`} />}
	                      {link.label}
	                    </Link>
	                  );
	                })}
                <div className="w-px h-6 bg-border mx-2" />
                <Link
                  href="/games"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                >
                  Games
                </Link>
              </nav>

              {/* Mobile nav toggle */}
              <MobileNav links={MOBILE_NAV_LINKS} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/30 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Swords className="h-6 w-6 text-purple-400" />
                  <span className="text-lg font-extrabold tracking-wider gradient-text font-display">3AGAME MASTER</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  The ultimate destination for AAA game guides. Expert-crafted strategies, detailed walkthroughs, and pro tips for the games you love.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 font-display tracking-wide">GUIDES</h4>
                <div className="flex flex-col gap-2">
                  {NAV_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 font-display tracking-wide">TOP GAMES</h4>
                <div className="flex flex-col gap-2">
                  <Link href="/games/elden-ring" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Elden Ring</Link>
                  <Link href="/games/baldurs-gate-3" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Baldur&apos;s Gate 3</Link>
                  <Link href="/games/final-fantasy-xvi" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Final Fantasy XVI</Link>
                  <Link href="/games/god-of-war-ragnarok" className="text-sm text-muted-foreground hover:text-foreground transition-colors">God of War Ragnarok</Link>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">&copy; 2024 3A Game Master. All rights reserved.</p>
              <p className="text-xs text-muted-foreground">Not affiliated with any game publishers. All game names are trademarks of their respective owners.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
