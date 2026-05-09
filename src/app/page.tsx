import Link from 'next/link';
import { Swords, Shield, MapIcon, Gamepad2, Lightbulb, ChevronRight, Flame, Clock, TrendingUp } from 'lucide-react';
import { formatDate, stripHtml, truncateText } from '@/lib/game-utils';

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  status: string;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  created_at: string;
  game_name: string | null;
  game_slug: string | null;
  cover_image_url?: string | null;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  article_count: number;
}

async function getPublishedArticles(): Promise<Article[]> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/articles?status=published&limit=12`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

async function getGames(): Promise<Game[]> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/games`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.games || []).filter((g: Game) => g.article_count > 0);
  } catch {
    return [];
  }
}

function getGuideBadge(keywords: string[] | null): { label: string; className: string } {
  if (!keywords || keywords.length === 0) return { label: 'Guide', className: 'badge-walkthrough' };
  const kw = keywords.join(' ').toLowerCase();
  if (kw.includes('boss') || kw.includes('fight') || kw.includes('defeat') || kw.includes('battle')) return { label: 'BOSS', className: 'badge-boss' };
  if (kw.includes('build') || kw.includes('class') || kw.includes('loadout') || kw.includes('weapon')) return { label: 'BUILD', className: 'badge-build' };
  if (kw.includes('collect') || kw.includes('location') || kw.includes('find') || kw.includes('hidden')) return { label: 'COLLECTIBLE', className: 'badge-collectible' };
  if (kw.includes('tip') || kw.includes('trick') || kw.includes('secret')) return { label: 'TIPS', className: 'badge-tips' };
  return { label: 'GUIDE', className: 'badge-walkthrough' };
}

export default async function HomePage() {
  const [articles, games] = await Promise.all([getPublishedArticles(), getGames()]);

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="min-h-screen">
      {/* HERO SECTION */}
      <section className="hero-pattern relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12 animate-slide-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight font-display mb-4">
              <span className="gradient-text">CONQUER</span>{' '}
              <span className="text-foreground">EVERY</span>{' '}
              <span className="gradient-text">GAME</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Boss strategies. Optimal builds. Hidden secrets. The definitive guides for the games that matter.
            </p>
          </div>

          {/* Quick Category Links */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { href: '/guides?type=boss', label: 'Boss Guides', icon: Swords, color: 'border-red-500/40 text-red-400 hover:bg-red-500/10' },
              { href: '/guides?type=build', label: 'Builds', icon: Shield, color: 'border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10' },
              { href: '/guides?type=collectible', label: 'Collectibles', icon: MapIcon, color: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' },
              { href: '/guides?type=walkthrough', label: 'Walkthroughs', icon: Gamepad2, color: 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10' },
              { href: '/guides?type=tips', label: 'Tips & Tricks', icon: Lightbulb, color: 'border-green-500/40 text-green-400 hover:bg-green-500/10' },
            ].map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 ${cat.color}`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ARTICLE */}
      {featured && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <Link href={`/guides/${featured.slug}`} className="block group">
            <div className="game-card overflow-hidden">
              {featured.cover_image_url ? (
                <div className="relative">
                  <img
                    src={featured.cover_image_url}
                    alt={featured.title}
                    className="w-full h-64 sm:h-80 object-cover"
                    width={1200}
                    height={630}
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const badge = getGuideBadge(featured.keywords);
                        return <span className={badge.className}>{badge.label}</span>;
                      })()}
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                        <Flame className="h-3 w-3" /> FEATURED
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-display group-hover:text-purple-300 transition-colors leading-tight">
                      {featured.title}
                    </h2>
                    {featured.summary && (
                      <p className="text-gray-300 mb-4 leading-relaxed line-clamp-2">
                        {featured.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {featured.game_name && (
                        <span className="text-purple-400 font-medium">{featured.game_name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {featured.published_at ? formatDate(featured.published_at) : 'Recently'}
                      </span>
                      <span>By {featured.author}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-3">
                    {(() => {
                      const badge = getGuideBadge(featured.keywords);
                      return <span className={badge.className}>{badge.label}</span>;
                    })()}
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                      <Flame className="h-3 w-3" /> FEATURED
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 font-display group-hover:text-purple-300 transition-colors leading-tight">
                    {featured.title}
                  </h2>
                  {featured.summary && (
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {featured.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {featured.game_name && (
                      <span className="text-purple-400 font-medium">{featured.game_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {featured.published_at ? formatDate(featured.published_at) : 'Recently'}
                    </span>
                    <span>By {featured.author}</span>
                  </div>
                  <div className="flex items-center text-purple-400 group-hover:text-cyan-400 transition-colors mt-3">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                </div>
              )}
            </div>
          </Link>
        </section>
      )}

      {/* LATEST GUIDES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <h2 className="text-2xl font-bold font-display tracking-wide">LATEST GUIDES</h2>
          </div>
          <Link href="/guides" className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-cyan-400 transition-colors">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {rest.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((article) => {
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
                      {!article.cover_image_url && article.game_name && (
                        <span className="text-xs text-purple-400 font-medium mb-2">{article.game_name}</span>
                      )}
                      {article.cover_image_url && article.game_name && (
                        <span className="text-xs text-purple-400 font-medium mb-2">{article.game_name}</span>
                      )}
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-purple-300 transition-colors leading-snug font-display">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed">
                        {article.summary || truncateText(stripHtml(article.content), 150)}
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
          <div className="text-center py-12 text-muted-foreground">
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-1">No guides yet</p>
            <p className="text-sm">Check back soon for epic game guides!</p>
          </div>
        )}
      </section>

      {/* GAME ZONES */}
      {games.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-2xl font-bold font-display tracking-wide">GAME ZONES</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {games.slice(0, 10).map((game) => (
              <Link key={game.id} href={`/games/${game.slug}`} className="block group">
                <div className="game-card p-4 text-center">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-cyan-400 transition-colors mb-1 font-display leading-tight">
                    {game.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{game.article_count} guides</p>
                  {game.genre && (
                    <p className="text-[10px] text-purple-400 mt-1 font-medium uppercase tracking-wider">{game.genre}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
