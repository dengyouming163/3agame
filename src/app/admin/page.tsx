'use client';

import { useState, useEffect, useCallback } from 'react';
import { Swords, Shield, Map, Gamepad2, Lightbulb, BarChart3, FileText, Zap, Calendar, Trash2, Eye, CheckCircle, RefreshCw, Clock, TrendingUp, BookOpen, AlertCircle, ChevronDown, ChevronRight, Loader2, ImagePlus } from 'lucide-react';

// ===== TYPES =====
interface Article {
  id: number;
  game_id: number | null;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  status: string;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  game_name: string | null;
  game_slug: string | null;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  article_count: number;
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
  todayPublished: number;
  weekGenerated: number;
}

interface TopGame {
  name: string;
  slug: string;
  article_count: number;
}

// ===== TAB CONFIG =====
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'articles', label: 'Articles', icon: FileText },
  { id: 'generate', label: 'AI Generate', icon: Zap },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ===== STATUS HELPERS =====
function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'status-draft',
    generated: 'status-generated',
    reviewed: 'status-reviewed',
    published: 'status-published',
  };
  return map[status] || 'status-draft';
}

function getQueueStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'status-generated',
    publishing: 'status-reviewed',
    published: 'status-published',
    failed: 'badge-boss',
  };
  return map[status] || 'status-draft';
}

// ===== MAIN COMPONENT =====
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setTopGames(data.topGames || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const res = await fetch(`/api/articles?${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter]);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchGames();
  }, [fetchDashboard, fetchGames]);

  useEffect(() => {
    if (activeTab === 'articles') fetchArticles();
    if (activeTab === 'schedule') fetchQueue();
    if (activeTab === 'dashboard') fetchDashboard();
  }, [activeTab, fetchArticles, fetchQueue, fetchDashboard]);

  // ===== ACTIONS =====
  const handleReview = async (articleId: number) => {
    const res = await fetch(`/api/articles/${articleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    if (res.ok) fetchArticles();
  };

  const handlePublishNow = async (articleId: number) => {
    const res = await fetch(`/api/articles/${articleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    if (res.ok) fetchArticles();
  };

  const handleDelete = async (articleId: number) => {
    if (!confirm('Delete this article?')) return;
    const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
    if (res.ok) fetchArticles();
  };

  const handleGenerate = async () => {
    if (!selectedGame) return alert('Select a game first');
    setGenerating(true);
    try {
      const res = await fetch('/api/generate/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: parseInt(selectedGame) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Generated: "${data.article.title}"`);
        fetchArticles();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Generation failed');
      console.error(e);
    }
    setGenerating(false);
  };

  const handleGenerateImage = async (articleId: number, gameName: string | null) => {
    setGeneratingImage(articleId);
    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, prompt: `${gameName || 'game'} epic gameplay scene, dark fantasy atmosphere` }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Image generated and saved!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Image generation failed');
      console.error(e);
    }
    setGeneratingImage(null);
  };

  const handleSchedule = async (articleId: number) => {
    if (!scheduleDate) return alert('Select a date');
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, scheduledAt: new Date(scheduleDate).toISOString() }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      fetchQueue();
      fetchArticles();
    } else {
      alert(`Error: ${data.error}`);
    }
  };

  const handleProcessQueue = async () => {
    const res = await fetch('/api/publish', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`Published ${data.published} article(s)`);
      fetchQueue();
      fetchArticles();
      fetchDashboard();
    }
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Swords className="h-7 w-7 text-purple-400" />
          <h1 className="text-2xl font-black font-display gradient-text">COMMAND CENTER</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto border-b border-border pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-purple-400 text-purple-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={BookOpen} label="Total Articles" value={stats.totalArticles} color="text-purple-400" />
              <StatCard icon={TrendingUp} label="Today Published" value={stats.todayPublished} color="text-green-400" />
              <StatCard icon={Zap} label="This Week Generated" value={stats.weekGenerated} color="text-cyan-400" />
              <StatCard icon={Gamepad2} label="Total Games" value={stats.totalGames} color="text-amber-400" />
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="game-card p-6">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">ARTICLE STATUS</h3>
                <div className="space-y-3">
                  {Object.entries(stats.articlesByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusBadge(status)}`}>
                        {status.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${stats.totalArticles > 0 ? (count / stats.totalArticles) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="game-card p-6">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">TOP GAMES</h3>
                <div className="space-y-3">
                  {topGames.length > 0 ? topGames.map((game, i) => (
                    <div key={game.slug} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-400 w-5">#{i + 1}</span>
                        <span className="text-sm text-foreground">{game.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{game.article_count} articles</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Queue Status */}
            <div className="game-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">PUBLISH QUEUE</h3>
                <button
                  onClick={handleProcessQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-all"
                >
                  <RefreshCw className="h-3 w-3" />
                  Process Now
                </button>
              </div>
              <div className="flex gap-4">
                {Object.entries(stats.queueByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getQueueStatusBadge(status)}`}>
                      {status.toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-foreground">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.queueByStatus).length === 0 && (
                  <p className="text-sm text-muted-foreground">Queue is empty</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div>
            {/* Filter */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-muted-foreground">Filter:</span>
              {['', 'generated', 'reviewed', 'published'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === s
                      ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {s ? s.toUpperCase() : 'ALL'}
                </button>
              ))}
              <span className="ml-auto text-sm text-muted-foreground">{articles.length} articles</span>
            </div>

            {/* Article List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <div key={article.id} className="game-card p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${getStatusBadge(article.status)}`}>
                            {article.status.toUpperCase()}
                          </span>
                          {article.game_name && (
                            <span className="text-xs text-purple-400 font-medium">{article.game_name}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-foreground leading-snug">{article.title}</h3>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(article.created_at).toLocaleDateString()}</span>
                          <span>{article.author}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {article.status === 'generated' && (
                          <>
                            <button onClick={() => handleReview(article.id)} title="Approve" className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(article.id)} title="Reject" className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {article.status === 'reviewed' && (
                          <button onClick={() => handlePublishNow(article.id)} title="Publish Now" className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                          title="Preview"
                          className="p-1.5 rounded-lg bg-accent text-muted-foreground hover:text-foreground transition-all"
                        >
                          {expandedArticle === article.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleGenerateImage(article.id, article.game_name)}
                          title="Generate Image"
                          disabled={generatingImage === article.id}
                          className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                        >
                          {generatingImage === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded preview */}
                    {expandedArticle === article.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-xs text-muted-foreground max-h-64 overflow-y-auto" dangerouslySetInnerHTML={{ __html: article.content.slice(0, 3000) }} />
                        <div className="mt-3 flex items-center gap-2">
                          {article.status === 'reviewed' && (
                            <div className="flex items-center gap-2">
                              <input
                                type="datetime-local"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="px-2 py-1 rounded bg-card border border-border text-xs text-foreground"
                              />
                              <button
                                onClick={() => handleSchedule(article.id)}
                                className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
                              >
                                Schedule
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">No articles found</p>
              </div>
            )}
          </div>
        )}

        {/* AI Generate Tab */}
        {activeTab === 'generate' && (
          <div>
            <div className="game-card p-6 max-w-lg">
              <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">GENERATE NEW GUIDE</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Select Game</label>
                  <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="">-- Choose a game --</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.article_count} guides)</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedGame}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Generate Guide with AI
                    </>
                  )}
                </button>

                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/80">
                      AI will auto-select a trending topic for the game and generate a full guide with SEO optimization. Generated articles need your review before publishing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">PUBLISH QUEUE</h3>
              <button
                onClick={handleProcessQueue}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Process Due Items
              </button>
            </div>

            {queue.length > 0 ? (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="game-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.article_title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(item.scheduled_at).toLocaleString()}</span>
                          <span>Attempts: {item.attempts}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getQueueStatusBadge(item.status)}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">Queue is empty</p>
                <p className="text-sm mt-1">Review and schedule articles from the Articles tab.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== STAT CARD COMPONENT =====
function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="game-card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-card ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-black font-display text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}
