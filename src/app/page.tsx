import Link from 'next/link';
import { Gamepad2, Shield, Zap, Clock, ArrowRight, Star } from 'lucide-react';

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  article_count: string;
}

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

async function getPublishedArticles(): Promise<Article[]> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/articles?status=published&limit=6`, {
      cache: 'no-store',
    });
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
    const res = await fetch(`${protocol}${domain}/api/games`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.games || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [articles, games] = await Promise.all([
    getPublishedArticles(),
    getGames(),
  ]);

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
              <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/guides" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Guides
              </Link>
              <Link href="/games" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Games
              </Link>
              <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-violet-500/5 to-indigo-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Zap className="h-4 w-4" />
              AI-Powered Game Guides
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
              Master Every
              <span className="gradient-text"> AAA Game</span>
              <br />
              With Pro Guides
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Expert-crafted walkthroughs, boss strategies, and build guides for the biggest titles.
              Updated daily with AI-generated content, human-reviewed for quality.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                Browse Guides
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/games"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-8 py-3 text-base font-semibold text-card-foreground hover:bg-accent transition-colors"
              >
                Explore Games
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">{games.length}+</div>
              <div className="text-sm text-muted-foreground mt-1">AAA Games Covered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">{articles.length}+</div>
              <div className="text-sm text-muted-foreground mt-1">Published Guides</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">Daily</div>
              <div className="text-sm text-muted-foreground mt-1">Content Updates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">AI+Human</div>
              <div className="text-sm text-muted-foreground mt-1">Quality Assurance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Latest Guides</h2>
            <p className="text-muted-foreground mt-2">Fresh strategies and walkthroughs for top titles</p>
          </div>
          <Link href="/guides" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
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
                  {article.keywords?.slice(0, 2).map((kw) => (
                    <span key={kw} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {kw}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>
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
          <div className="text-center py-16">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No guides published yet</h3>
            <p className="text-muted-foreground mb-6">Visit the admin panel to generate and publish game guides.</p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Go to Admin
            </Link>
          </div>
        )}
      </section>

      {/* Games Grid */}
      <section className="bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground">Covered Games</h2>
            <p className="text-muted-foreground mt-2">Comprehensive guides for the biggest AAA titles</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="group rounded-xl border border-border bg-card p-4 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {game.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {parseInt(game.article_count, 10)} guide{parseInt(game.article_count, 10) !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
          <p className="text-muted-foreground mt-2">AI-powered content pipeline for quality game guides</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Generation</h3>
            <p className="text-sm text-muted-foreground">
              Our AI analyzes game data and community strategies to generate comprehensive, SEO-optimized guide content automatically.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Human Review</h3>
            <p className="text-sm text-muted-foreground">
              Every guide goes through human editorial review to ensure accuracy, quality, and relevance before publication.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Scheduled Publishing</h3>
            <p className="text-sm text-muted-foreground">
              Approved guides are automatically published on schedule, ensuring consistent content flow and maximum SEO impact.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Gamepad2 className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold gradient-text">GameVault Pro</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Your ultimate destination for AAA game guides. AI-powered content generation meets human editorial quality for the best gaming resources.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/guides" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Guides</Link></li>
                <li><Link href="/games" className="text-sm text-muted-foreground hover:text-primary transition-colors">Games</Link></li>
                <li><Link href="/admin" className="text-sm text-muted-foreground hover:text-primary transition-colors">Admin Panel</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Popular Games</h4>
              <ul className="space-y-2">
                {games.slice(0, 4).map((game) => (
                  <li key={game.id}>
                    <Link href={`/games/${game.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {game.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} GameVault Pro. All rights reserved. AI-powered game guide platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
