import Link from 'next/link';
import { Gamepad2, ArrowLeft, Clock, Share2, Tag } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/articles?status=published&limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return { title: 'Guide Not Found' };
    const data = await res.json();
    const article = data.articles?.find((a: { slug: string }) => a.slug === slug);
    if (!article) return { title: 'Guide Not Found' };
    return {
      title: article.meta_title || article.title,
      description: article.meta_description || article.summary || `Read ${article.title} on GameVault Pro`,
      keywords: article.keywords || [],
      openGraph: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.summary,
        type: 'article',
        publishedTime: article.published_at,
        authors: [article.author || 'GameVault Pro'],
        tags: article.keywords || [],
      },
    };
  } catch {
    return { title: 'Guide | GameVault Pro' };
  }
}

interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  status: string;
  language: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  game_name: string;
  game_slug: string;
  cover_image_url: string | null;
}

async function getArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    // First get the article list to find the ID
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const listRes = await fetch(`${protocol}${domain}/api/articles?status=published&limit=100`, {
      cache: 'no-store',
    });
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    const articleStub = listData.articles?.find((a: { slug: string }) => a.slug === slug);
    if (!articleStub) return null;

    const detailRes = await fetch(`${protocol}${domain}/api/articles/${articleStub.id}`, {
      cache: 'no-store',
    });
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json();
    return detailData.article;
  } catch {
    return null;
  }
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Guide Not Found</h1>
          <p className="text-muted-foreground mb-6">The guide you are looking for does not exist or has been removed.</p>
          <Link href="/guides" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Guides
          </Link>
        </div>
      </div>
    );
  }

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
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</Link>
              <Link href="/guides" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Guides</Link>
              <Link href="/games" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Games</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Article Header */}
      <header className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              All Guides
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href={`/games/${article.game_slug}`} className="text-sm text-primary hover:underline">
              {article.game_name}
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.published_at
                ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Recently Published'}
            </span>
            <span>By {article.author}</span>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {article.game_name}
            </span>
          </div>
          {article.keywords && article.keywords.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {article.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {article.cover_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden border border-border">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        )}
        <article
          className="article-content prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Share Section */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Found this guide helpful?</h3>
              <p className="text-sm text-muted-foreground">Share it with fellow gamers!</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        {/* Related Tags */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-3">Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold gradient-text">GameVault Pro</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} GameVault Pro. AI-powered game guides.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
