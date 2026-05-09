import Link from 'next/link';
import { Gamepad2, ArrowLeft, Clock } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/games`, { cache: 'no-store' });
    if (!res.ok) return { title: 'Game Not Found' };
    const data = await res.json();
    const game = data.games?.find((g: { slug: string }) => g.slug === slug);
    if (!game) return { title: 'Game Not Found' };
    return {
      title: `${game.name} Guides & Walkthroughs`,
      description: `Browse all guides and walkthroughs for ${game.name}. Expert strategies, boss guides, and tips.`,
    };
  } catch {
    return { title: 'Game | GameVault Pro' };
  }
}

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  description: string | null;
  article_count: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  game_name: string;
  published_at: string | null;
  keywords: string[] | null;
}

export default async function GamePage({ params }: PageProps) {
  const { slug } = await params;

  let game: Game | null = null;
  let articles: Article[] = [];

  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';

    const [gamesRes, articlesRes] = await Promise.all([
      fetch(`${protocol}${domain}/api/games`, { cache: 'no-store' }),
      fetch(`${protocol}${domain}/api/articles?status=published&limit=50`, { cache: 'no-store' }),
    ]);

    if (gamesRes.ok) {
      const gamesData = await gamesRes.json();
      game = gamesData.games?.find((g: { slug: string }) => g.slug === slug) || null;
    }

    if (articlesRes.ok && game) {
      const articlesData = await articlesRes.json();
      articles = (articlesData.articles || []).filter((a: { game_slug: string }) => a.game_slug === slug);
    }
  } catch {
    // Ignore fetch errors
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Game Not Found</h1>
          <p className="text-muted-foreground mb-6">The game you are looking for is not in our database.</p>
          <Link href="/games" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Browse Games
          </Link>
        </div>
      </div>
    );
  }

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
            </div>
          </div>
        </div>
      </nav>

      <section className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/games" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              All Games
            </Link>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Gamepad2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">{game.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {game.genre && (
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                    {game.genre}
                  </span>
                )}
                {game.platform && (
                  <span className="text-sm text-muted-foreground">{game.platform}</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {articles.length} guide{articles.length !== 1 ? 's' : ''}
                </span>
              </div>
              {game.description && (
                <p className="text-muted-foreground mt-3 max-w-2xl">{game.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">Available Guides</h2>
        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/guides/${article.slug}`}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {article.summary || 'Read this comprehensive guide for expert strategies and tips.'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {article.published_at
                    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Recently'}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No guides yet</h3>
            <p className="text-muted-foreground">Guides for {game.name} are coming soon!</p>
          </div>
        )}
      </section>
    </div>
  );
}
