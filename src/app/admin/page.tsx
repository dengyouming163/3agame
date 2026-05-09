'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Gamepad2, Shield, Plus, Eye, CheckCircle, Clock, Trash2,
  Sparkles, Image, Calendar, RefreshCw, ChevronDown, Loader2,
  BarChart3, FileText, Zap, Play, X, Edit3
} from 'lucide-react';

/* ─── Types ─── */
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
  content: string;
  summary: string | null;
  cover_image_key: string | null;
  status: string;
  game_id: number | null;
  game_name: string;
  game_slug: string;
  language: string;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface QueueItem {
  id: number;
  article_id: number;
  scheduled_at: string;
  status: string;
  attempts: number;
  article_title: string;
}

interface DashboardStats {
  totalArticles: number;
  articlesByStatus: Record<string, number>;
  totalGames: number;
  queueByStatus: Record<string, number>;
}

interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  status: string;
  cover_image_key: string | null;
  cover_image_url: string | null;
  language: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  author: string;
  game_name: string;
  game_slug: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Utility ─── */
function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    generated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    reviewed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    publishing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  };
  return styles[status] || styles.draft;
}

/* ─── Main Component ─── */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'generate' | 'schedule'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  // Generate form state
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');

  // Schedule form state
  const [scheduleArticleId, setScheduleArticleId] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('');

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await fetch(`/api/articles?limit=50${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchGames();
  }, [fetchStats, fetchGames]);

  useEffect(() => {
    if (activeTab === 'articles' || activeTab === 'schedule') {
      fetchArticles();
    }
    if (activeTab === 'schedule') {
      fetchQueue();
    }
  }, [activeTab, fetchArticles, fetchQueue]);

  // Generate article
  const handleGenerate = async () => {
    if (!selectedGame) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: parseInt(selectedGame, 10),
          topic: customTopic || undefined,
          language: 'en',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Article generated: "${data.article.title}"`);
        fetchStats();
        fetchArticles();
        setCustomTopic('');
      } else {
        alert(`Generation failed: ${data.error}`);
      }
    } catch (err) {
      alert('Generation error. Please try again.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // View article detail
  const handleViewArticle = async (id: number) => {
    try {
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data.article);
        setShowArticleModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch article:', err);
    }
  };

  // Update article status
  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchArticles();
        fetchStats();
        if (showArticleModal && selectedArticle?.id === id) {
          setSelectedArticle({ ...selectedArticle, status });
        }
      }
    } catch (err) {
      console.error('Failed to update article:', err);
    }
  };

  // Delete article
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchArticles();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  // Generate image for article
  const handleGenerateImage = async (articleId: number, articleTitle: string) => {
    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          prompt: `${articleTitle} - epic game art style`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Cover image generated successfully!');
        if (showArticleModal && selectedArticle?.id === articleId) {
          handleViewArticle(articleId);
        }
        fetchArticles();
      } else {
        alert(`Image generation failed: ${data.error}`);
      }
    } catch (err) {
      alert('Image generation error.');
      console.error(err);
    }
  };

  // Schedule article for publishing
  const handleSchedule = async () => {
    if (!scheduleArticleId || !scheduleDate) return;
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: parseInt(scheduleArticleId, 10),
          scheduledAt: new Date(scheduleDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchQueue();
        fetchArticles();
        fetchStats();
        setScheduleArticleId('');
        setScheduleDate('');
      } else {
        alert(`Scheduling failed: ${data.error}`);
      }
    } catch (err) {
      alert('Scheduling error.');
      console.error(err);
    }
  };

  // Process publish queue
  const handleProcessQueue = async () => {
    try {
      const res = await fetch('/api/publish', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Published ${data.published} article(s)${data.errors ? `. Errors: ${data.errors.join(', ')}` : ''}`);
        fetchQueue();
        fetchStats();
        fetchArticles();
      }
    } catch (err) {
      alert('Publish processing error.');
      console.error(err);
    }
  };

  const reviewableArticles = articles.filter((a) => a.status === 'generated' || a.status === 'reviewed');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Gamepad2 className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold gradient-text">GameVault Pro</span>
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Shield className="h-3.5 w-3.5" />
                Admin
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                View Site
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border mb-8">
          {[
            { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
            { key: 'articles' as const, label: 'Articles', icon: FileText },
            { key: 'generate' as const, label: 'AI Generate', icon: Sparkles },
            { key: 'schedule' as const, label: 'Schedule & Publish', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalArticles}</p>
                    <p className="text-xs text-muted-foreground">Total Articles</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.articlesByStatus.published || 0}</p>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.articlesByStatus.generated || 0}</p>
                    <p className="text-xs text-muted-foreground">Pending Review</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalGames}</p>
                    <p className="text-xs text-muted-foreground">Games Covered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="rounded-xl border border-border bg-card p-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Articles by Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['generated', 'reviewed', 'published', 'draft'].map((status) => (
                  <div key={status} className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-foreground">{stats.articlesByStatus[status] || 0}</p>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium mt-2 ${getStatusBadge(status)}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('generate')}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Generate Article</p>
                    <p className="text-xs text-muted-foreground">AI-powered content creation</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('articles')}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Edit3 className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Review Articles</p>
                    <p className="text-xs text-muted-foreground">{stats.articlesByStatus.generated || 0} pending review</p>
                  </div>
                </button>
                <button
                  onClick={handleProcessQueue}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Play className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Process Queue</p>
                    <p className="text-xs text-muted-foreground">Publish scheduled articles</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Articles</h2>
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="generated">Generated</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="published">Published</option>
                </select>
                <button
                  onClick={() => fetchArticles()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(article.status)}`}>
                            {article.status}
                          </span>
                          {article.game_name && (
                            <span className="text-xs text-primary font-medium">{article.game_name}</span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-foreground line-clamp-1">{article.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {article.summary || 'No summary available'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Created: {new Date(article.created_at).toLocaleDateString()}</span>
                          {article.published_at && (
                            <span>Published: {new Date(article.published_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewArticle(article.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {article.status === 'generated' && (
                          <button
                            onClick={() => handleStatusUpdate(article.id, 'reviewed')}
                            className="inline-flex items-center gap-1 rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-3 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                            title="Approve for review"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}
                        {article.status === 'reviewed' && (
                          <button
                            onClick={() => handleStatusUpdate(article.id, 'published')}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                            title="Publish now"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No articles found</h3>
                <p className="text-muted-foreground mb-6">
                  {statusFilter !== 'all'
                    ? `No articles with status "${statusFilter}". Try a different filter.`
                    : 'Generate your first article using the AI Generate tab.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-2">AI Content Generator</h2>
            <p className="text-muted-foreground mb-8">
              Select a game and generate an SEO-optimized guide article powered by AI.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Select Game</label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="">Choose a game...</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Custom Topic <span className="text-muted-foreground">(optional - leave empty for auto-selection)</span>
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g., Best builds for Honour Mode, All boss strategies..."
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {selectedGame && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Suggested Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const game = games.find((g) => g.id === parseInt(selectedGame, 10));
                      if (!game) return null;
                      const topics: Record<string, string[]> = {
                        'elden-ring': ['Boss strategies', 'Optimal builds', 'Hidden areas', 'Weapon tier list', 'Spirit Ashes guide'],
                        'baldurs-gate-3': ['Honour Mode builds', 'Romance guide', 'Spell tier list', 'Hidden quests', 'Class combos'],
                        'zelda-totk': ['Shrine solutions', 'Ultrahand building', 'Sage abilities', 'Armor upgrades', 'Dragon farming'],
                        'final-fantasy-xvi': ['Eikon combos', 'Chronolith Trials', 'Ultimaniac Mode', 'Accessory tier list', 'NG+ content'],
                        'god-of-war-ragnarok': ['Valkyrie strategies', 'Runic attacks', 'Armor sets', 'Berserker Gravestones', 'GMGoW tips'],
                        'starfield': ['Ship builds', 'Outpost building', 'Companion guide', 'Best weapons', 'NG+ explained'],
                        'cyberpunk-2077-phantom-liberty': ['Phantom Liberty story', 'Cyberware builds', 'Relic skill tree', 'Dogtown secrets', 'Iconic weapons'],
                        'resident-evil-4-remake': ['Professional S+ rank', 'Weapon upgrades', 'Treasure guide', 'Mercenaries mode', 'Knife-only challenge'],
                        'diablo-iv': ['Build tier list', 'Nightmare Dungeons', 'Uber bosses', 'Legendary aspects', 'Paragon guide'],
                        'horizon-forbidden-west': ['Machine override', 'Best weapons', 'Cauldron walkthroughs', 'Relic Ruins', 'Ultra Hard tips'],
                      };
                      return (topics[game.slug] || ['General guide', 'Beginner tips', 'Advanced strategies']).map((topic) => (
                        <button
                          key={topic}
                          onClick={() => setCustomTopic(topic)}
                          className="inline-flex items-center rounded-md bg-card border border-border px-2.5 py-1 text-xs text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {topic}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!selectedGame || generating}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Article
                  </>
                )}
              </button>

              {generating && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">AI is generating your article...</p>
                      <p className="text-xs text-muted-foreground">This typically takes 15-30 seconds</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent generation review */}
            {reviewableArticles.length > 0 && (
              <div className="mt-12">
                <h3 className="text-lg font-semibold text-foreground mb-4">Pending Review ({reviewableArticles.length})</h3>
                <div className="space-y-3">
                  {reviewableArticles.slice(0, 5).map((article) => (
                    <div key={article.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{article.title}</p>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium mt-1 ${getStatusBadge(article.status)}`}>
                          {article.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewArticle(article.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          View
                        </button>
                        {article.status === 'generated' && (
                          <button
                            onClick={() => handleStatusUpdate(article.id, 'reviewed')}
                            className="rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-3 py-1.5 text-xs font-medium hover:opacity-80"
                          >
                            Approve
                          </button>
                        )}
                        {!article.cover_image_key && (
                          <button
                            onClick={() => handleGenerateImage(article.id, article.title)}
                            className="rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 text-xs font-medium hover:opacity-80"
                          >
                            <Image className="h-3 w-3 inline mr-1" />
                            Add Image
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Schedule & Publish</h2>
                <p className="text-muted-foreground mt-1">Schedule articles for automatic publishing</p>
              </div>
              <button
                onClick={handleProcessQueue}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" />
                Process Queue Now
              </button>
            </div>

            {/* Schedule Form */}
            <div className="rounded-xl border border-border bg-card p-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Schedule New Article</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Article</label>
                  <select
                    value={scheduleArticleId}
                    onChange={(e) => setScheduleArticleId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select article...</option>
                    {reviewableArticles.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduleArticleId || !scheduleDate}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </button>
                </div>
              </div>
            </div>

            {/* Queue List */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Publish Queue</h3>
                <button
                  onClick={() => fetchQueue()}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              {queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.article_title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                        {item.attempts > 0 && (
                          <span className="text-xs text-muted-foreground">Attempts: {item.attempts}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No items in the publish queue</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      {showArticleModal && selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(selectedArticle.status)}`}>
                    {selectedArticle.status}
                  </span>
                  {selectedArticle.game_name && (
                    <span className="text-xs text-primary font-medium">{selectedArticle.game_name}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-foreground line-clamp-2">{selectedArticle.title}</h2>
              </div>
              <button
                onClick={() => setShowArticleModal(false)}
                className="shrink-0 ml-4 rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              {/* Meta Info */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Meta Title</p>
                  <p className="text-sm text-foreground">{selectedArticle.meta_title || 'N/A'}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Language</p>
                  <p className="text-sm text-foreground">{selectedArticle.language?.toUpperCase() || 'EN'}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Meta Description</p>
                  <p className="text-sm text-foreground">{selectedArticle.meta_description || 'N/A'}</p>
                </div>
                {selectedArticle.keywords && selectedArticle.keywords.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedArticle.keywords.map((kw) => (
                        <span key={kw} className="inline-flex items-center rounded-md bg-card border border-border px-2 py-0.5 text-xs text-foreground">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cover Image */}
              {selectedArticle.cover_image_url ? (
                <div className="mb-6 rounded-lg overflow-hidden border border-border">
                  <img src={selectedArticle.cover_image_url} alt={selectedArticle.title} className="w-full h-auto max-h-64 object-cover" />
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={() => handleGenerateImage(selectedArticle.id, selectedArticle.title)}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors w-full justify-center"
                  >
                    <Image className="h-5 w-5" />
                    Generate Cover Image with AI
                  </button>
                </div>
              )}

              {/* Content Preview */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Content Preview</h3>
                <div
                  className="article-content rounded-lg border border-border bg-background p-6 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              {selectedArticle.status === 'generated' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedArticle.id, 'reviewed');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve for Review
                </button>
              )}
              {selectedArticle.status === 'reviewed' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedArticle.id, 'published');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  <Play className="h-4 w-4" />
                  Publish Now
                </button>
              )}
              <button
                onClick={() => setShowArticleModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
