import Link from 'next/link';
import { Swords, ArrowLeft, Clock, Share2, Tag, BookOpen } from 'lucide-react';
import { formatDate, stripHtml } from '@/lib/game-utils';
import { getSiteUrl } from '@/lib/utils';
import { getImageUrlSync } from '@/lib/storage';
import { query } from '@/lib/db';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
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
  updated_at: string | null;
  game_id: number | null;
  game_name: string | null;
  game_slug: string | null;
  cover_image_key: string | null;
}

// Direct DB query — single query by slug
async function getArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    const result = await query(
      `SELECT a.id, a.title, a.slug, a.content, a.summary, a.status, a.language,
        a.meta_title, a.meta_description, a.keywords, a.author,
        a.published_at, a.updated_at, a.cover_image_key, a.game_id,
        g.name as game_name, g.slug as game_slug
       FROM articles a
       LEFT JOIN games g ON a.game_id = g.id
       WHERE a.slug = $1 AND a.status = 'published'`,
      [slug]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as ArticleDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticle(slug);
    if (!article) return { title: 'Guide Not Found' };
    const coverUrl = getImageUrlSync(article.cover_image_key);
    return {
      title: article.meta_title || article.title,
      description: article.meta_description || article.summary || `Read ${article.title} on 3A Game Master`,
      keywords: article.keywords || [],
      openGraph: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.summary || undefined,
        type: 'article',
        url: `${getSiteUrl()}/guides/${slug}`,
        images: coverUrl !== '/placeholder-image.svg' ? [{ url: coverUrl, width: 1200, height: 630 }] : undefined,
        publishedTime: article.published_at || undefined,
        authors: [article.author || '3A Game Master'],
        tags: article.keywords || [],
      },
    };
  } catch {
    return { title: 'Guide | 3A Game Master' };
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

// Extract FAQ Q&A pairs from article HTML content
function extractFAQ(html: string): Array<{ question: string; answer: string }> {
  const faqPairs: Array<{ question: string; answer: string }> = [];
  // Match FAQ sections: <h2>FAQ</h2> or <h2>Frequently Asked Questions</h2> followed by Q&A
  const faqRegex = /<h[23][^>]*>(?:FAQ|Frequently Asked Questions|Common Questions)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/i;
  const faqMatch = html.match(faqRegex);
  if (!faqMatch) return faqPairs;
  
  const faqSection = faqMatch[1];
  // Match Q&A patterns: <h3/h4>Question</h3/h4> followed by <p>Answer</p>
  const qaRegex = /<h[34][^>]*>([\s\S]*?)<\/h[34]>\s*(?:<p>([\s\S]*?)<\/p>|<ul[^>]*>([\s\S]*?)<\/ul>|<ol[^>]*>([\s\S]*?)<\/ol>)/gi;
  let match;
  while ((match = qaRegex.exec(faqSection)) !== null) {
    const question = match[1].replace(/<[^>]*>/g, '').trim();
    const answer = (match[2] || match[3] || match[4] || '').replace(/<[^>]*>/g, '').trim();
    if (question && answer) {
      faqPairs.push({ question, answer });
    }
  }
  return faqPairs.slice(0, 8); // Max 8 FAQ items for schema
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  // Fetch related articles for internal linking
  let relatedArticles: Array<{
    id: number; title: string; slug: string; cover_image_key: string | null; game_name: string | null;
  }> = [];
  if (article) {
    try {
      const { query: dbQuery } = await import('@/lib/db');
      // Get articles from the same game, or with similar keywords
      const relatedResult = article.game_id
        ? await dbQuery(
            `SELECT a.id, a.title, a.slug, a.cover_image_key, g.name as game_name
             FROM articles a LEFT JOIN games g ON a.game_id = g.id
             WHERE a.game_id = $1 AND a.id != $2 AND a.status = 'published'
             ORDER BY a.published_at DESC LIMIT 6`,
            [article.game_id, article.id]
          )
        : await dbQuery(
            `SELECT a.id, a.title, a.slug, a.cover_image_key, g.name as game_name
             FROM articles a LEFT JOIN games g ON a.game_id = g.id
             WHERE a.status = 'published' AND a.id != $1
             ORDER BY a.published_at DESC LIMIT 6`,
            [article.id]
          );
      relatedArticles = relatedResult.rows;
    } catch {
      // Non-critical, continue without related articles
    }
  }

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
  const coverUrl = getImageUrlSync(article.cover_image_key);

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.meta_title || article.title,
    description: article.meta_description || article.summary || '',
    image: coverUrl !== '/placeholder-image.svg' ? coverUrl : undefined,
    author: {
      '@type': 'Organization',
      name: article.author || '3A Game Master',
    },
    publisher: {
      '@type': 'Organization',
      name: '3A Game Master',
      logo: {
        '@type': 'ImageObject',
        url: 'https://3agamemaster.com/logo.png',
      },
    },
    datePublished: article.published_at || undefined,
    dateModified: article.updated_at || article.published_at || undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://3agamemaster.com/guides/${article.slug}`,
    },
    keywords: article.keywords?.join(', ') || undefined,
    articleSection: article.game_name || 'Game Guides',
    wordCount: stripHtml(article.content).split(/\s+/).length,
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://3agamemaster.com' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://3agamemaster.com/guides' },
      ...(article.game_name && article.game_slug ? [{ '@type': 'ListItem', position: 3, name: article.game_name, item: `https://3agamemaster.com/games/${article.game_slug}` }] : []),
      { '@type': 'ListItem', position: article.game_name ? 4 : 3, name: article.title, item: `https://3agamemaster.com/guides/${article.slug}` },
    ],
  };

  // FAQ Schema - extract Q&A pairs from content (## FAQ or ## Frequently Asked Questions section)
  const faqPairs = extractFAQ(article.content);
  const faqSchema = faqPairs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqPairs.map(pair => ({
      '@type': 'Question',
      name: pair.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: pair.answer,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

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
            {article.updated_at && article.updated_at !== article.published_at && (
              <span className="flex items-center gap-1.5 text-cyan-400/70">
                <Clock className="h-4 w-4" />
                Updated {formatDate(article.updated_at)}
              </span>
            )}
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
        {article.cover_image_key && (
          <div className="mb-10 rounded-xl overflow-hidden border border-border glow-border">
            <img
              src={coverUrl}
              alt={article.title}
              className="w-full h-auto object-cover max-h-[400px]"
              width={1200}
              height={630}
              fetchPriority="high"
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

        {/* Related Articles - Internal Linking (P1) */}
        {relatedArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-bold text-foreground font-display mb-6 tracking-wide">RELATED GUIDES</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedArticles.map((related) => {
                const relCoverUrl = getImageUrlSync(related.cover_image_key);
                return (
                  <Link
                    key={related.id}
                    href={`/guides/${related.slug}`}
                    className="group rounded-xl border border-border bg-card/50 overflow-hidden hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] transition-all duration-300"
                  >
                    {related.cover_image_key && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={relCoverUrl}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width={400}
                          height={225}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {related.game_name && (
                        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{related.game_name}</span>
                      )}
                      <h4 className="text-sm font-semibold text-foreground mt-1 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                        {related.title}
                      </h4>
                    </div>
                  </Link>
                );
              })}
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
