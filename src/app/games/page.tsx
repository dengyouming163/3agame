import Link from 'next/link';
import { Gamepad2, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Game Zones - Browse AAA Games',
  description: 'Browse all AAA game zones. Find guides for Elden Ring, Baldur\'s Gate 3, Final Fantasy, God of War, and more top-tier titles.',
  keywords: ['AAA games', 'game guides by title', 'Elden Ring guides', 'Baldur\'s Gate 3 guides', 'FF16 guides'],
};

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  description: string | null;
  article_count: number;
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

function getGenreColor(genre: string | null): string {
  if (!genre) return 'text-muted-foreground';
  const g = genre.toLowerCase();
  if (g.includes('rpg')) return 'text-purple-400';
  if (g.includes('action')) return 'text-red-400';
  if (g.includes('adventure')) return 'text-cyan-400';
  if (g.includes('horror')) return 'text-amber-400';
  if (g.includes('survival')) return 'text-green-400';
  return 'text-muted-foreground';
}

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="hero-pattern border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl sm:text-4xl font-black font-display gradient-text-cyan mb-3" style={{ background: 'linear-gradient(90deg, #22d3ee, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            GAME ZONES
          </h1>
          <p className="text-muted-foreground text-lg">
            Pick your game. We&apos;ve got the guides to help you dominate.
          </p>
        </div>
      </section>

      {/* Games Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <Link key={game.id} href={`/games/${game.slug}`} className="block group">
                <div className="game-card p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-cyan-400 transition-colors font-display leading-tight">
                      {game.name}
                    </h3>
                    {game.article_count > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md px-2 py-0.5 shrink-0 ml-2">
                        <BookOpen className="h-3 w-3" />
                        {game.article_count}
                      </span>
                    )}
                  </div>

                  {game.genre && (
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${getGenreColor(game.genre)}`}>
                      {game.genre}
                    </p>
                  )}

                  {game.platform && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {game.platform}
                    </p>
                  )}

                  {game.description && (
                    <p className="text-sm text-muted-foreground flex-1 leading-relaxed line-clamp-2">
                      {game.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-1">No games yet</p>
            <p className="text-sm">Games will appear here as guides are published.</p>
          </div>
        )}
      </section>
    </div>
  );
}
