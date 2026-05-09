import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Swords } from 'lucide-react';
import { formatDate } from '@/lib/game-utils';
import { getBaseUrl } from '@/lib/utils';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/games`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'Game Not Found' };
    const data = await res.json();
    const game = data.games?.find((g: { slug: string }) => g.slug === slug);
    if (!game) return { title: 'Game Not Found' };
    return {
      title: `${game.name} Guides - Boss Strategies, Builds & Walkthroughs`,
      description: game.description || `Find the best ${game.name} guides. Boss strategies, optimal builds, collectible walkthroughs, and pro tips.`,
      keywords: [game.name, `${game.name} guide`, `${game.name} walkthrough`, `${game.name} boss strategy`, `${game.name} builds`],
    };
  } catch {
    return { title: 'Game | 3A Game Master' };
  }
}

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  description: string | null;
  article_count: number;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  created_at: string;
  cover_image_url: string | null;
}

async function getGameData(slug: string): Promise<{ game: Game | null; articles: Article[] }> {
  try {
    const baseUrl = getBaseUrl();

    const [gamesRes, articlesRes] = await Promise.all([
      fetch(`${baseUrl}/api/games`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/articles?status=published&limit=50`, { next: { revalidate: 3600 } }),
    ]);

    if (!gamesRes.ok || !articlesRes.ok) return { game: null, articles: [] };

    const gamesData = await gamesRes.json();
    const articlesData = await articlesRes.json();

    const game = (gamesData.games || []).find((g: Game) => g.slug === slug) || null;
    const articles = (articlesData.articles || []).filter((a: { game_slug: string }) => a.game_slug === slug);

    return { game, articles };
  } catch {
    return { game: null, articles: [] };
  }
}

function getGuideBadge(keywords: string[] | null): { label: string; className: string } {
  if (!keywords || keywords.length === 0) return { label: 'Guide', className: 'badge-walkthrough' };
  const kw = keywords.join(' ').toLowerCase();
  if (kw.includes('boss') || kw.includes('fight') || kw.includes('defeat')) return { label: 'BOSS', className: 'badge-boss' };
  if (kw.includes('build') || kw.includes('class') || kw.includes('loadout')) return { label: 'BUILD', className: 'badge-build' };
  if (kw.includes('collect') || kw.includes('location') || kw.includes('find')) return { label: 'COLLECTIBLE', className: 'badge-collectible' };
  if (kw.includes('tip') || kw.includes('trick') || kw.includes('secret')) return { label: 'TIPS', className: 'badge-tips' };
  return { label: 'GUIDE', className: 'badge-walkthrough' };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { game, articles } = await getGameData(slug);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Swords className="h-16 w-16 text-purple-500/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2 font-display">GAME NOT FOUND</h1>
          <p className="text-muted-foreground mb-6">This game doesn&apos;t exist in our database.</p>
          <Link href="/games" className="inline-flex items-center gap-2 rounded-lg bg-purple-500/20 border border-purple-500/30 px-6 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-500/30 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Game Header */}
      <section className="hero-pattern border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Link href="/games" className="text-muted-foreground hover:text-cyan-400 transition-colors">Games</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{game.name}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-display text-foreground mb-3">{game.name}</h1>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {game.genre && (
              <span className="inline-flex items-center rounded-md bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-400">
                {game.genre}
              </span>
            )}
            {game.platform && (
              <span className="text-muted-foreground">{game.platform}</span>
            )}
            <span className="flex items-center gap-1 text-cyan-400 font-semibold">
              <BookOpen className="h-4 w-4" />
              {articles.length} Guides
            </span>
          </div>

          {game.description && (
            <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              {game.description}
            </p>
          )}
        </div>
      </section>

      {/* Guides for this game */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const badge = getGuideBadge(article.keywords);
              return (
                <Link key={article.id} href={`/guides/${article.slug}`} className="block group">
                  <div className="game-card overflow-hidden h-full flex flex-col">
                    {article.cover_image_url ? (
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={article.cover_image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width={400}
                          height={200}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className={badge.className}>{badge.label}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-5 pb-0">
                        <span className={badge.className}>{badge.label}</span>
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-purple-300 transition-colors leading-snug font-display">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed">
                        {article.summary || 'Expert guide with detailed strategies and pro tips.'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.published_at ? formatDate(article.published_at) : 'Recently'}
                        </span>
                        <span>{article.author}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-1">No guides yet for {game.name}</p>
            <p className="text-sm">Check back soon - our AI is working on it!</p>
          </div>
        )}
      </section>
    </div>
  );
}
