import Link from 'next/link';
import { Swords, ArrowLeft, Clock, Share2, Tag, BookOpen } from 'lucide-react';
import { formatDate, stripHtml } from '@/lib/game-utils';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const res = await fetch(`${protocol}${domain}/api/articles?status=published&limit=100`, { cache: 'no-store' });
    if (!res.ok) return { title: 'Guide Not Found' };
    const data = await res.json();
    const article = data.articles?.find((a: { slug: string }) => a.slug === slug);
    if (!article) return { title: 'Guide Not Found' };
    return {
      title: article.meta_title || article.title,
      description: article.meta_description || article.summary || `Read ${article.title} on 3A Game Master`,
      keywords: article.keywords || [],
      openGraph: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.summary,
        type: 'article',
        publishedTime: article.published_at,
        authors: [article.author || '3A Game Master'],
        tags: article.keywords || [],
      },
    };
  } catch {
    return { title: 'Guide | 3A Game Master' };
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
  game_name: string | null;
  game_slug: string | null;
  cover_image_url: string | null;
}

async function getArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const listRes = await fetch(`${protocol}${domain}/api/articles?status=published&limit=100`, { cache: 'no-store' });
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    const articleStub = listData.articles?.find((a: { slug: string }) => a.slug === slug);
    if (!articleStub) return null;

    const detailRes = await fetch(`${protocol}${domain}/api/articles/${articleStub.id}`, { cache: 'no-store' });
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json();
    return detailData.article;
  } catch {
    return null;
  }
}

function getGuideBadge(keywords: string[] | null): { label: string; className: string } {
  if (!keywords || keywords.length === 0) return { label: 'Guide', className: 'badge-walkthrough' };
  const kw = keywords.join(' ').toLowerCase();
  if (kw.includes('boss') || kw.includes('fight') || kw.includes('defeat')) return { label: 'BOSS GUIDE', className: 'badge-boss' };
  if (kw.includes('build') || kw.includes('class') || kw.includes('loadout')) return { label: 'BUILD GUIDE', className: 'badge-build' };
  if (kw.includes('collect') || kw.includes('location') || kw.includes('find')) return { label: 'COLLECTIBLE', className: 'badge-collectible' };
  if (kw.includes('tip') || kw.includes('trick') || kw.includes('secret')) return { label: 'TIPS & TRICKS', className: 'badge-tips' };
  return { label: 'WALKTHROUGH', className: 'badge-walkthrough' };
}

// Calculate estimated reading time
function getReadingTime(content: string): string {
  const text = stripHtml(content);
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 250);
  return `${minutes} min read`;
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Swords className="h-16 w-16 text-purple-500/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2 font-display">GUIDE NOT FOUND</h1>
          <p className="text-muted-foreground mb-6">This guide doesn&apos;t exist or has been removed.</p>
          <Link href="/guides" className="inline-flex items-center gap-2 rounded-lg bg-purple-500/20 border border-purple-500/30 px-6 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-500/30 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Guides
          </Link>
        </div>
      </div>
    );
  }

  const badge = getGuideBadge(article.keywords);
  const readingTime = getReadingTime(article.content);

  return (
    <div className="min-h-screen">
      {/* Article Header */}
      <header className="hero-pattern border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Link href="/guides" className="text-muted-foreground hover:text-purple-400 transition-colors">
              Guides
            </Link>
            <span className="text-muted-foreground">/</span>
            {article.game_slug && article.game_name ? (
              <>
                <Link href={`/games/${article.game_slug}`} className="text-purple-400 hover:text-cyan-400 transition-colors">
                  {article.game_name}
                </Link>
                <span className="text-muted-foreground">/</span>
              </>
            ) : null}
            <span className="text-muted-foreground truncate max-w-[200px]">{article.title}</span>
          </div>

          {/* Badge */}
          <span className={badge.className}>{badge.label}</span>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-4 mb-5 font-display leading-tight">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {article.published_at ? formatDate(article.published_at) : 'Recently Published'}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {readingTime}
            </span>
            <span>By <span className="text-foreground font-medium">{article.author}</span></span>
            {article.game_name && (
              <span className="inline-flex items-center rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">
                {article.game_name}
              </span>
            )}
          </div>

          {/* Keywords */}
          {article.keywords && article.keywords.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {article.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center rounded-md bg-card border border-border px-2 py-0.5 text-xs text-muted-foreground">
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
          <div className="mb-10 rounded-xl overflow-hidden border border-border glow-border">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-auto object-cover max-h-[400px]"
              loading="eager"
            />
          </div>
        )}

        <article
          className="article-content prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Share Section */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground font-display">FOUND THIS GUIDE HELPFUL?</h3>
              <p className="text-sm text-muted-foreground mt-1">Share it with fellow gamers!</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-500/20 transition-colors">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        {/* Related Tags */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-3 font-display tracking-wide">RELATED TOPICS</h3>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center rounded-lg bg-card border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-purple-500/30 hover:text-purple-400 transition-all cursor-pointer">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to All Guides
          </Link>
        </div>
      </main>
    </div>
  );
}
