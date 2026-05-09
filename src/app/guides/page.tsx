import Link from 'next/link';
import { Gamepad2, ArrowLeft, Clock, Star } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Game Guides',
  description: 'Browse all game guides, walkthroughs, and strategies for AAA titles. Expert content updated daily.',
};

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  game_name: string;
  game_slug: string;
  published_at: string | null;
  keywords: string[] | null;
}

async function getArticles(): Promise<Article[]> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/articles?status=published&limit=50`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

export default async function GuidesPage() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">GameVault Pro</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/guides" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Guides
              </Link>
              <Link href="/games" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Games
              </Link>
              <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground">All Game Guides</h1>
          <p className="text-muted-foreground mt-2">
            {articles.length} expert guide{articles.length !== 1 ? 's' : ''} across all games
          </p>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/guides/${article.slug}`}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {article.game_name}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {article.summary || 'Read this comprehensive guide for expert strategies and tips.'}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recently'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    AI Generated
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No guides published yet</h3>
            <p className="text-muted-foreground">Check back soon for new content!</p>
          </div>
        )}
      </section>
    </div>
  );
}
