import Link from 'next/link';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Browse all AAA games covered by GameVault Pro. Find guides for Elden Ring, Baldur\'s Gate 3, and more.',
};

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  article_count: string;
}

async function getGames(): Promise<Game[]> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/games`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.games || [];
  } catch {
    return [];
  }
}

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">GameVault Pro</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</Link>
              <Link href="/guides" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Guides</Link>
              <Link href="/games" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Games</Link>
              <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground">All Games</h1>
          <p className="text-muted-foreground mt-2">{games.length} AAA titles covered</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.slug}`}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Gamepad2 className="h-7 w-7 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {game.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {game.genre && (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {game.genre}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {parseInt(game.article_count, 10)} guide{parseInt(game.article_count, 10) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {game.platform && (
                    <p className="text-xs text-muted-foreground mt-2">{game.platform}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
