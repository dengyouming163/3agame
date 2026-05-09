import Link from 'next/link';
import { Swords, Shield, MapIcon, Gamepad2, Lightbulb, Clock, Filter } from 'lucide-react';
import { formatDate } from '@/lib/game-utils';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Game Guides - Boss Strategies, Builds, Walkthroughs & More',
  description: 'Browse all AAA game guides. Boss strategies, optimal builds, collectible walkthroughs, and pro tips for Elden Ring, Baldur\'s Gate 3, Final Fantasy, and more.',
  keywords: ['game guides', 'boss strategy', 'best builds', 'walkthrough', 'collectible guide', 'AAA game tips'],
};

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  status: string;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  created_at: string;
  game_name: string | null;
  game_slug: string | null;
  cover_image_url: string | null;
}

async function getArticles(type?: string): Promise<Article[]> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const typeParam = type ? `&type=${type}` : '';
    const res = await fetch(`${protocol}${domain}/api/articles?status=published&limit=50${typeParam}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
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

const FILTER_TABS = [
  { type: '', label: 'All Guides', icon: Filter },
  { type: 'boss', label: 'Boss Guides', icon: Swords },
  { type: 'build', label: 'Builds', icon: Shield },
  { type: 'collectible', label: 'Collectibles', icon: MapIcon },
  { type: 'walkthrough', label: 'Walkthroughs', icon: Gamepad2 },
  { type: 'tips', label: 'Tips & Tricks', icon: Lightbulb },
];

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = params.type || '';
  const articles = await getArticles(type);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="hero-pattern border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl sm:text-4xl font-black font-display gradient-text mb-3">
            GAME GUIDES
          </h1>
          <p className="text-muted-foreground text-lg">
            Expert-crafted strategies for the games you play. Every guide battle-tested and updated.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-3 -mb-px">
            {FILTER_TABS.map((tab) => (
              <Link
                key={tab.type}
                href={tab.type ? `/guides?type=${tab.type}` : '/guides'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  type === tab.type
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const badge = getGuideBadge(article.keywords);
              return (
                <Link key={article.id} href={`/guides/${article.slug}`} className="block group">
                  <div className="game-card overflow-hidden h-full flex flex-col">
                    {article.cover_image_url ? (
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={article.cover_image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width={400}
                          height={220}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className={badge.className}>{badge.label}</span>
                        </div>
                        {article.game_name && (
                          <div className="absolute bottom-3 left-3">
                            <span className="text-xs text-purple-300 font-semibold bg-black/50 px-2 py-0.5 rounded">{article.game_name}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-5 pb-0">
                        <span className={badge.className}>{badge.label}</span>
                        {article.game_name && (
                          <span className="text-xs text-purple-400 font-medium">{article.game_name}</span>
                        )}
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {!article.cover_image_url && article.game_name && (
                        <span className="text-xs text-purple-400 font-medium mb-2">{article.game_name}</span>
                      )}
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
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-1">No guides found</p>
            <p className="text-sm">
              {type ? `No ${type} guides yet. Try another category!` : 'Check back soon for epic game guides!'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
