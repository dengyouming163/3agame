'use client';

import { useState, useEffect, useCallback } from 'react';
import { Swords, Shield, MapIcon, Gamepad2, Lightbulb, BarChart3, FileText, Zap, Calendar, Trash2, Eye, CheckCircle, RefreshCw, Clock, TrendingUp, BookOpen, AlertCircle, ChevronDown, ChevronRight, Loader2, ImagePlus, Flame, Sparkles, ListChecks, Play, CheckCheck, XCircle, Activity, Target, ArrowUpRight, Lock } from 'lucide-react';

// ===== TYPES =====
interface Article {
  id: number;
  game_id: number | null;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  cover_image_url?: string | null;
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
  article_status: string;
}

interface DashboardStats {
  totalArticles: number;
  articlesByStatus: Record<string, number>;
  totalGames: number;
  queueByStatus: Record<string, number>;
  todayPublished: number;
  weekGenerated: number;
  generationSuccessRate: number;
  pendingReview: number;
  readyToPublish: number;
  todayScheduled: number;
}

interface TopGame {
  name: string;
  slug: string;
  article_count: number;
}

interface TopicItem {
  topic: string;
  used: boolean;
}

interface TrendingTopic {
  gameSlug: string;
  gameName: string;
  topic: string;
  guideType: string;
  priority: number;
  keywords: string[];
}

interface GuideTypeOption {
  type: string;
  label: string;
  icon: string;
  description: string;
}

interface PlannedArticle {
  gameSlug: string;
  gameId: number;
  topic: string;
  guideType: string;
}

interface ScheduleStats {
  total: number;
  pending: number;
  published: number;
  failed: number;
  today_scheduled: number;
  today_published: number;
}

interface TrendItem {
  date: string;
  count: number;
}

// ===== TAB CONFIG =====
const TABS = [
  { id: 'dashboard', label: '数据概览', icon: BarChart3 },
  { id: 'articles', label: '内容审核', icon: FileText },
  { id: 'generate', label: 'AI生成', icon: Zap },
  { id: 'schedule', label: '发布调度', icon: Calendar },
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

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    generated: '已生成',
    reviewed: '已审核',
    published: '已发布',
  };
  return map[status] || status;
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

function getQueueStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '等待中',
    publishing: '发布中',
    published: '已发布',
    failed: '失败',
  };
  return map[status] || status;
}

function getGuideTypeIcon(type: string) {
  const map: Record<string, string> = {
    boss: '\u2694\uFE0F',
    build: '\uD83D\uDEE1\uFE0F',
    collectible: '\uD83D\uDDFA\uFE0F',
    walkthrough: '\uD83D\uDCD6',
    tips: '\uD83D\uDCA1',
  };
  return map[type] || '\uD83D\uDCDD';
}

function getGuideTypeLabel(type: string) {
  const map: Record<string, string> = {
    boss: 'Boss攻略',
    build: 'Build配装',
    collectible: '收集指南',
    walkthrough: '流程攻略',
    tips: '技巧提示',
  };
  return map[type] || type;
}

// ===== MAIN COMPONENT =====
export default function AdminPage() {
  // Auth state
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [publishTrend, setPublishTrend] = useState<TrendItem[]>([]);
  const [generationTrend, setGenerationTrend] = useState<TrendItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [scheduleStats, setScheduleStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // AI Generate tab state
  const [guideType, setGuideType] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [guideTypes, setGuideTypes] = useState<GuideTypeOption[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [batchPlan, setBatchPlan] = useState<PlannedArticle[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [showBatchPlan, setShowBatchPlan] = useState(false);

  // Daily schedule state
  const [dailyCount, setDailyCount] = useState(3);
  const [dailyStartHour, setDailyStartHour] = useState(9);
  const [dailyInterval, setDailyInterval] = useState(3);
  const [schedulingDaily, setSchedulingDaily] = useState(false);

  // Check login on mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_auth');
    if (isAuth === 'true') setAuthenticated(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_auth', 'true');
        setAuthenticated(true);
      } else {
        setLoginError('密码错误，请重试');
      }
    } catch {
      setLoginError('登录失败，请检查网络');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setAuthenticated(false);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setTopGames(data.topGames || []);
        setPublishTrend(data.publishTrend || []);
        setGenerationTrend(data.generationTrend || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const res = await fetch(`/api/articles?includeContent=true&${params}`);
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
        setScheduleStats(data.scheduleStats || null);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchTopics = useCallback(async (gameSlug: string) => {
    try {
      const params = new URLSearchParams();
      params.set('gameSlug', gameSlug);
      if (guideType) params.set('guideType', guideType);
      const res = await fetch(`/api/generate/topics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
        setTrending(data.trending || []);
        setGuideTypes(data.guideTypes || []);
      }
    } catch (e) { console.error(e); }
  }, [guideType]);

  useEffect(() => {
    if (!authenticated) return;
    fetchDashboard();
    fetchGames();
  }, [authenticated, fetchDashboard, fetchGames]);

  useEffect(() => {
    if (!authenticated) return;
    if (activeTab === 'articles') fetchArticles();
    if (activeTab === 'schedule') fetchQueue();
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'generate' && selectedGame) {
      const game = games.find(g => g.id.toString() === selectedGame);
      if (game) fetchTopics(game.slug);
    }
  }, [activeTab, fetchArticles, fetchQueue, fetchDashboard, fetchTopics, selectedGame, games, authenticated]);

  // ===== ACTIONS =====
  const handleReview = async (articleId: number) => {
    const res = await fetch(`/api/articles/${articleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    if (res.ok) { fetchArticles(); fetchDashboard(); }
  };

  const handlePublishNow = async (articleId: number) => {
    const res = await fetch(`/api/articles/${articleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    if (res.ok) { fetchArticles(); fetchDashboard(); fetchQueue(); }
  };

  const handleDelete = async (articleId: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
    if (res.ok) { fetchArticles(); fetchDashboard(); }
  };

  const handleBatchAction = async (action: 'review' | 'publish' | 'delete') => {
    if (selectedArticles.size === 0) return;
    const actionLabels = { review: '审核', publish: '发布', delete: '删除' };
    if (action === 'delete' && !confirm(`确定要删除 ${selectedArticles.size} 篇文章吗？`)) return;

    setBatchActionLoading(true);
    try {
      const res = await fetch('/api/articles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selectedArticles) }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedArticles(new Set());
        fetchArticles();
        fetchDashboard();
        fetchQueue();
        alert(`已${actionLabels[action]} ${data.affected} 篇文章`);
      }
    } catch (e) {
      alert('批量操作失败');
      console.error(e);
    }
    setBatchActionLoading(false);
  };

  const toggleSelectArticle = (id: number) => {
    setSelectedArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = articles
      .filter(a => statusFilter ? a.status === statusFilter : true)
      .map(a => a.id);
    setSelectedArticles(new Set(visibleIds));
  };

  const handleGenerate = async () => {
    if (!selectedGame) return alert('请先选择游戏');
    setGenerating(true);
    try {
      const body: Record<string, unknown> = { gameId: parseInt(selectedGame) };
      if (guideType) body.guideType = guideType;
      if (customTopic || selectedTopic) body.topic = customTopic || selectedTopic;

      const res = await fetch('/api/generate/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        alert(`生成成功："${data.article.title}" (${getGuideTypeLabel(data.article.guideType || 'guide')})`);
        fetchArticles();
        const game = games.find(g => g.id.toString() === selectedGame);
        if (game) fetchTopics(game.slug);
      } else {
        alert(`生成失败：${data.error}`);
      }
    } catch (e) {
      alert('生成失败');
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
        alert('封面图生成成功！');
        fetchArticles();
      } else {
        alert(`生成失败：${data.error}`);
      }
    } catch (e) {
      alert('图片生成失败');
      console.error(e);
    }
    setGeneratingImage(null);
  };

  const handleSchedule = async (articleId: number) => {
    if (!scheduleDate) return alert('请选择发布时间');
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
      alert(`调度失败：${data.error}`);
    }
  };

  const handleDailySchedule = async () => {
    setSchedulingDaily(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailySchedule: { count: dailyCount, startHour: dailyStartHour, intervalHours: dailyInterval } }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchQueue();
        fetchDashboard();
      } else {
        alert(`调度失败：${data.error}`);
      }
    } catch (e) {
      alert('每日调度失败');
      console.error(e);
    }
    setSchedulingDaily(false);
  };

  const handleProcessQueue = async () => {
    const res = await fetch('/api/publish', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`已发布 ${data.published} 篇文章`);
      fetchQueue();
      fetchArticles();
      fetchDashboard();
    }
  };

  // ===== BATCH GENERATE =====
  const handlePlanBatch = async () => {
    const game = games.find(g => g.id.toString() === selectedGame);
    if (!game) return alert('请先选择游戏');

    setBatchGenerating(true);
    try {
      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug: game.slug, count: 5, guideTypes: guideType ? [guideType] : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchPlan(data.plannedArticles);
        setShowBatchPlan(true);
      } else {
        alert(data.message || '没有可用的话题');
      }
    } catch (e) {
      alert('批量规划失败');
      console.error(e);
    }
    setBatchGenerating(false);
  };

  const handleExecuteBatch = async () => {
    if (batchPlan.length === 0) return;
    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: batchPlan.length });

    const results: { topic: string; success: boolean; title?: string }[] = [];

    for (let i = 0; i < batchPlan.length; i++) {
      const plan = batchPlan[i];
      setBatchProgress({ current: i + 1, total: batchPlan.length });
      try {
        const res = await fetch('/api/generate/article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: plan.gameId, topic: plan.topic, guideType: plan.guideType }),
        });
        const data = await res.json();
        results.push({ topic: plan.topic, success: data.success, title: data.article?.title });
      } catch {
        results.push({ topic: plan.topic, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    alert(`批量生成完成：${successCount}/${results.length} 篇成功`);
    setBatchPlan([]);
    setShowBatchPlan(false);
    fetchArticles();
    const game = games.find(g => g.id.toString() === selectedGame);
    if (game) fetchTopics(game.slug);
    setBatchGenerating(false);
  };

  // ===== LOGIN SCREEN =====
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="game-card p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-4">
                <Lock className="h-8 w-8 text-purple-400" />
              </div>
              <h1 className="text-xl font-black font-display gradient-text">3AGAME 管理后台</h1>
              <p className="text-xs text-muted-foreground mt-2">请输入管理员密码</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                placeholder="输入密码"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-muted-foreground/50"
                autoFocus
              />
              {loginError && (
                <p className="text-xs text-red-400 text-center">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading || !loginPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />验证中...</>
                ) : (
                  <><Lock className="h-4 w-4" />登录</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN ADMIN UI =====
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Swords className="h-7 w-7 text-purple-400" />
            <h1 className="text-2xl font-black font-display gradient-text">管理后台</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <Lock className="h-3.5 w-3.5" />
            退出登录
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto border-b border-border pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-purple-400 text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'articles' && stats && stats.pendingReview > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">{stats.pendingReview}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===== 数据概览 Tab ===== */}
        {activeTab === 'dashboard' && stats && (
          <div>
            {/* 快速统计 */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard icon={BookOpen} label="文章总数" value={stats.totalArticles} color="text-purple-400" />
              <StatCard icon={Target} label="待审核" value={stats.pendingReview} color="text-amber-400" highlight={stats.pendingReview > 0} />
              <StatCard icon={CheckCircle} label="待发布" value={stats.readyToPublish} color="text-cyan-400" />
              <StatCard icon={TrendingUp} label="今日发布" value={stats.todayPublished} color="text-green-400" />
              <StatCard icon={Zap} label="本周生成" value={stats.weekGenerated} color="text-cyan-400" />
            </div>

            {/* 第二行 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard icon={Activity} label="生成成功率" value={`${stats.generationSuccessRate}%`} color="text-green-400" />
              <StatCard icon={Calendar} label="今日调度" value={stats.todayScheduled} color="text-amber-400" />
              <StatCard icon={Gamepad2} label="游戏总数" value={stats.totalGames} color="text-amber-400" />
            </div>

            {/* 趋势图 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 发布趋势 */}
              <div className="game-card p-6">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">发布趋势（近7天）</h3>
                {publishTrend.length > 0 ? (
                  <div className="flex items-end gap-2 h-32">
                    {publishTrend.map((item, i) => {
                      const maxCount = Math.max(...publishTrend.map(t => t.count), 1);
                      const height = Math.max((item.count / maxCount) * 100, 4);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-green-400 font-bold">{item.count}</span>
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-green-600 to-green-400 transition-all"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{item.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无发布数据</p>
                )}
              </div>

              {/* 生成趋势 */}
              <div className="game-card p-6">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">生成趋势（近7天）</h3>
                {generationTrend.length > 0 ? (
                  <div className="flex items-end gap-2 h-32">
                    {generationTrend.map((item, i) => {
                      const maxCount = Math.max(...generationTrend.map(t => t.count), 1);
                      const height = Math.max((item.count / maxCount) * 100, 4);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-cyan-400 font-bold">{item.count}</span>
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{item.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无生成数据</p>
                )}
              </div>
            </div>

            {/* 状态分布 + TOP游戏 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="game-card p-6">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">文章状态分布</h3>
                <div className="space-y-3">
                  {Object.entries(stats.articlesByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusBadge(status)}`}>
                        {getStatusLabel(status)}
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
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">游戏覆盖率 TOP5</h3>
                <div className="space-y-3">
                  {topGames.length > 0 ? topGames.map((game, i) => (
                    <div key={game.slug} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-400 w-5">#{i + 1}</span>
                        <span className="text-sm text-foreground">{game.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{game.article_count} 篇</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">暂无数据</p>
                  )}
                </div>
              </div>
            </div>

            {/* 发布队列概览 */}
            <div className="game-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">发布队列</h3>
                <button
                  onClick={handleProcessQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-all"
                >
                  <Play className="h-3 w-3" />
                  立即执行
                </button>
              </div>
              <div className="flex gap-6">
                {Object.entries(stats.queueByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getQueueStatusBadge(status)}`}>
                      {getQueueStatusLabel(status)}
                    </span>
                    <span className="text-lg font-bold text-foreground">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.queueByStatus).length === 0 && (
                  <p className="text-sm text-muted-foreground">队列为空</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 内容审核 Tab ===== */}
        {activeTab === 'articles' && (
          <div>
            {/* 筛选 + 批量操作 */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-sm text-muted-foreground">筛选：</span>
              {[
                { key: '', label: '全部' },
                { key: 'generated', label: '已生成' },
                { key: 'reviewed', label: '已审核' },
                { key: 'published', label: '已发布' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setStatusFilter(s.key); setSelectedArticles(new Set()); }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === s.key
                      ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {s.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">共 {articles.length} 篇</span>
                {selectedArticles.size > 0 && (
                  <span className="text-xs text-purple-400 font-semibold">已选 {selectedArticles.size} 篇</span>
                )}
              </div>
            </div>

            {/* 批量操作栏 */}
            {selectedArticles.size > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-sm text-purple-300 font-semibold">已选 {selectedArticles.size} 篇</span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => handleBatchAction('review')}
                    disabled={batchActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-xs font-bold text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    批量审核
                  </button>
                  <button
                    onClick={() => handleBatchAction('publish')}
                    disabled={batchActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-50"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    批量发布
                  </button>
                  <button
                    onClick={() => handleBatchAction('delete')}
                    disabled={batchActionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    批量删除
                  </button>
                </div>
              </div>
            )}

            {/* 全选 */}
            {articles.length > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={selectAllVisible}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  全选当前列表
                </button>
                <button
                  onClick={() => setSelectedArticles(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  取消选择
                </button>
              </div>
            )}

            {/* 文章列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <div key={article.id} className={`game-card p-4 transition-all ${selectedArticles.has(article.id) ? 'ring-1 ring-purple-500/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* 复选框 */}
                      <button
                        onClick={() => toggleSelectArticle(article.id)}
                        className={`mt-1 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          selectedArticles.has(article.id)
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-muted-foreground/30 hover:border-purple-500/50'
                        }`}
                      >
                        {selectedArticles.has(article.id) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${getStatusBadge(article.status)}`}>
                            {getStatusLabel(article.status)}
                          </span>
                          {article.game_name && (
                            <span className="text-xs text-purple-400 font-medium">{article.game_name}</span>
                          )}
                          {article.keywords && article.keywords.length > 0 && (
                            <span className="text-[10px] text-cyan-400">{getGuideTypeIcon(article.keywords[0])} {getGuideTypeLabel(article.keywords[0])}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-foreground leading-snug">{article.title}</h3>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(article.created_at).toLocaleDateString()}</span>
                          <span>{article.author}</span>
                          {article.keywords && article.keywords.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ListChecks className="h-3 w-3" />
                              {article.keywords.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {article.status === 'generated' && (
                          <>
                            <button onClick={() => handleReview(article.id)} title="审核通过" className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(article.id)} title="拒绝并删除" className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {article.status === 'reviewed' && (
                          <button onClick={() => handlePublishNow(article.id)} title="立即发布" className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all">
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                          title="预览内容"
                          className="p-1.5 rounded-lg bg-accent text-muted-foreground hover:text-foreground transition-all"
                        >
                          {expandedArticle === article.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleGenerateImage(article.id, article.game_name)}
                          title="生成封面图"
                          disabled={generatingImage === article.id}
                          className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                        >
                          {generatingImage === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 展开预览 */}
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
                                定时发布
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
                <p className="font-semibold">暂无文章</p>
              </div>
            )}
          </div>
        )}

        {/* ===== AI生成 Tab ===== */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：生成控制 */}
            <div className="lg:col-span-1 space-y-4">
              <div className="game-card p-5">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">选择游戏</h3>
                <select
                  value={selectedGame}
                  onChange={(e) => { setSelectedGame(e.target.value); setSelectedTopic(''); setCustomTopic(''); }}
                  className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">-- 请选择游戏 --</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.article_count} 篇攻略)</option>
                  ))}
                </select>
              </div>

              <div className="game-card p-5">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">攻略类型</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    onClick={() => setGuideType('')}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                      guideType === '' ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    全部
                  </button>
                  {guideTypes.map((g) => (
                    <button
                      key={g.type}
                      onClick={() => setGuideType(g.type)}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                        guideType === g.type ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                      }`}
                      title={g.description}
                    >
                      {g.icon} {getGuideTypeLabel(g.type).slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="game-card p-5">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-4">自定义话题</h3>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => { setCustomTopic(e.target.value); setSelectedTopic(''); }}
                  placeholder="输入自定义话题，留空则自动选择..."
                  className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedGame}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />生成中...</>
                  ) : (
                    <><Zap className="h-4 w-4" />生成单篇攻略</>
                  )}
                </button>

                <button
                  onClick={handlePlanBatch}
                  disabled={batchGenerating || !selectedGame}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-sm font-bold text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {batchGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />规划中...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" />批量生成（5篇）</>
                  )}
                </button>
              </div>

              {showBatchPlan && batchPlan.length > 0 && (
                <div className="game-card p-5">
                  <h3 className="text-sm font-semibold font-display tracking-wide text-foreground mb-3">批量生成计划</h3>
                  <div className="space-y-2 mb-4">
                    {batchPlan.map((plan, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span>{getGuideTypeIcon(plan.guideType)}</span>
                        <span className="text-foreground font-medium truncate">{plan.topic}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExecuteBatch}
                      disabled={batchGenerating}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-xs font-bold text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50"
                    >
                      {batchGenerating ? (
                        <><Loader2 className="h-3 w-3 animate-spin" />{batchProgress.current}/{batchProgress.total}</>
                      ) : (
                        <><CheckCircle className="h-3 w-3" />确认生成</>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowBatchPlan(false); setBatchPlan([]); }}
                      className="px-3 py-2 rounded-lg bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300/80 space-y-1">
                    <p>AI会自动选择热门话题并填充SEO关键词，选择攻略类型可获得专业格式。</p>
                    <p>生成的文章需要审核后才能发布。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：话题与趋势 */}
            <div className="lg:col-span-2 space-y-4">
              {trending.length > 0 && (
                <div className="game-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">热门话题</h3>
                  </div>
                  <div className="space-y-2">
                    {trending.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedTopic(t.topic); setCustomTopic(''); }}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-all ${
                          selectedTopic === t.topic
                            ? 'bg-purple-500/20 border border-purple-500/30'
                            : 'bg-card border border-border hover:border-purple-500/20'
                        }`}
                      >
                        <span className="text-lg shrink-0">{getGuideTypeIcon(t.guideType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{t.topic}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-purple-400">{t.gameName}</span>
                            <span className="text-xs text-muted-foreground">优先级：{'\uD83D\uDD25'.repeat(Math.ceil(t.priority / 3))}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {t.keywords.slice(0, 3).map((kw, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedGame && topics.length > 0 && (
                <div className="game-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ListChecks className="h-4 w-4 text-green-400" />
                    <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">可用话题</h3>
                    <span className="ml-auto text-xs text-muted-foreground">{topics.filter(t => !t.used).length} 可用 / {topics.length} 总计</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                    {topics.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { if (!t.used) { setSelectedTopic(t.topic); setCustomTopic(''); } }}
                        disabled={t.used}
                        className={`text-left flex items-center gap-2 p-2.5 rounded-lg transition-all text-sm ${
                          t.used
                            ? 'bg-card/50 border border-border opacity-50 cursor-not-allowed'
                            : selectedTopic === t.topic
                              ? 'bg-purple-500/20 border border-purple-500/30 text-foreground'
                              : 'bg-card border border-border hover:border-purple-500/20 text-foreground'
                        }`}
                      >
                        {t.used ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500/50 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-purple-500/30 shrink-0" />
                        )}
                        <span className="truncate">{t.topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!selectedGame && (
                <div className="text-center py-16 text-muted-foreground">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-lg">请先选择游戏查看话题</p>
                  <p className="text-sm mt-1">从热门话题中选择，或让AI自动选择最佳话题</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 发布调度 Tab ===== */}
        {activeTab === 'schedule' && (
          <div>
            {/* 每日自动调度 */}
            <div className="game-card p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">每日自动调度</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">自动将已审核文章安排到当天不同时间段发布，错峰提升SEO效果。</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">每日发布篇数</label>
                  <select
                    value={dailyCount}
                    onChange={(e) => setDailyCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    {[1, 2, 3, 5, 8, 10].map(n => (
                      <option key={n} value={n}>{n} 篇</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">起始时间（24小时制）</label>
                  <select
                    value={dailyStartHour}
                    onChange={(e) => setDailyStartHour(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(h => (
                      <option key={h} value={h}>{h}:00 UTC</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">发布间隔</label>
                  <select
                    value={dailyInterval}
                    onChange={(e) => setDailyInterval(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    {[1, 2, 3, 4, 6].map(h => (
                      <option key={h} value={h}>每 {h} 小时</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleDailySchedule}
                disabled={schedulingDaily}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all disabled:opacity-50"
              >
                {schedulingDaily ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />调度中...</>
                ) : (
                  <><Calendar className="h-4 w-4" />立即调度</>
                )}
              </button>
            </div>

            {/* 调度统计 */}
            {scheduleStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="game-card p-4 text-center">
                  <p className="text-2xl font-black font-display text-foreground">{scheduleStats.today_scheduled}</p>
                  <p className="text-xs text-muted-foreground">今日调度</p>
                </div>
                <div className="game-card p-4 text-center">
                  <p className="text-2xl font-black font-display text-green-400">{scheduleStats.today_published}</p>
                  <p className="text-xs text-muted-foreground">今日已发</p>
                </div>
                <div className="game-card p-4 text-center">
                  <p className="text-2xl font-black font-display text-amber-400">{scheduleStats.pending}</p>
                  <p className="text-xs text-muted-foreground">等待发布</p>
                </div>
                <div className="game-card p-4 text-center">
                  <p className="text-2xl font-black font-display text-red-400">{scheduleStats.failed}</p>
                  <p className="text-xs text-muted-foreground">发布失败</p>
                </div>
              </div>
            )}

            {/* 队列操作 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">发布队列（{queue.length} 条）</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleProcessQueue}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition-all"
                >
                  <Play className="h-4 w-4" />
                  执行到期任务
                </button>
              </div>
            </div>

            {queue.length > 0 ? (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="game-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.article_title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(item.scheduled_at).toLocaleString()}</span>
                          <span>重试次数：{item.attempts}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getQueueStatusBadge(item.status)}`}>
                          {getQueueStatusLabel(item.status)}
                        </span>
                        {item.status === 'failed' && (
                          <button
                            onClick={async () => {
                              await fetch('/api/schedule', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ articleId: item.article_id, scheduledAt: new Date().toISOString() }),
                              });
                              fetchQueue();
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
                            title="重试"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">队列为空</p>
                <p className="text-sm mt-1">请先审核文章，然后使用每日自动调度安排发布。</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== STAT CARD COMPONENT =====
function StatCard({ icon: Icon, label, value, color, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string; highlight?: boolean }) {
  return (
    <div className={`game-card p-5 ${highlight ? 'ring-1 ring-amber-500/30' : ''}`}>
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
