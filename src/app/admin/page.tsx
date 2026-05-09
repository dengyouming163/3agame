'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Swords, BarChart3, FileText, Zap, Calendar, CheckCircle, TrendingUp, BookOpen, Activity, Target, ArrowUpRight, Eye, Clock, Loader2, RefreshCw, Play, MousePointerClick, Globe, ExternalLink, MapPin } from 'lucide-react';

// ===== TYPES =====
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

interface TrendItem {
  date: string;
  count: number;
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

interface ScheduleStats {
  total: number;
  pending: number;
  published: number;
  failed: number;
  today_scheduled: number;
  today_published: number;
}

interface Article {
  id: number;
  title: string;
  status: string;
  summary: string | null;
  keywords: string[] | null;
  game_name: string | null;
  created_at: string;
  published_at: string | null;
}

interface AnalyticsDailyTrend {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
}

interface AnalyticsTopPage {
  path: string;
  views: number;
  uniqueVisitors: number;
}

interface AnalyticsTopReferrer {
  source: string;
  views: number;
}

interface AnalyticsTopCountry {
  region: string;
  views: number;
  uniqueVisitors: number;
}

interface AnalyticsTopGuide {
  path: string;
  title: string;
  views: number;
  uniqueVisitors: number;
}

interface AnalyticsData {
  today: { pageViews: number; uniqueVisitors: number };
  yesterday: { pageViews: number; uniqueVisitors: number };
  total: { pageViews: number; uniqueVisitors: number };
  weekAvg: { pageViews: number; uniqueVisitors: number };
  thirtyDayTrend: AnalyticsDailyTrend[];
  topPages: AnalyticsTopPage[];
  topReferrers: AnalyticsTopReferrer[];
  topCountries: AnalyticsTopCountry[];
  topGuides: AnalyticsTopGuide[];
}

interface DailyGenResult {
  game: string;
  topic: string;
  guideType: string;
  status: string;
  title?: string;
  error?: string;
}

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

// ===== TAB CONFIG =====
const TABS = [
  { id: 'dashboard' as const, label: '数据概览', icon: BarChart3 },
  { id: 'analytics' as const, label: '流量报表', icon: Activity },
  { id: 'daily' as const, label: '每日生成', icon: Zap },
  { id: 'articles' as const, label: '文章管理', icon: FileText },
  { id: 'schedule' as const, label: '发布调度', icon: Calendar },
];

type TabId = (typeof TABS)[number]['id'];

// ===== MAIN COMPONENT =====
const ADMIN_PWS = 'dengyouming2tll';

function AdminContent() {
  const searchParams = useSearchParams();
  const adminPws = searchParams.get('pws');
  
  if (adminPws !== ADMIN_PWS) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">Unauthorized access</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [publishTrend, setPublishTrend] = useState<TrendItem[]>([]);
  const [generationTrend, setGenerationTrend] = useState<TrendItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [scheduleStats, setScheduleStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Daily generation state
  const [dailyGenerating, setDailyGenerating] = useState(false);
  const [dailyResults, setDailyResults] = useState<DailyGenResult[] | null>(null);
  const [dailyMessage, setDailyMessage] = useState<string>('');

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
      const res = await fetch(`/api/articles?${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter]);

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

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) { console.error(e); }
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'articles') fetchArticles();
    if (activeTab === 'schedule') fetchQueue();
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchArticles, fetchQueue, fetchDashboard, fetchAnalytics]);

  const handleDailyGenerate = async () => {
    if (!confirm('确认执行每日自动生成？将为每个游戏生成2篇攻略并自动发布。')) return;
    setDailyGenerating(true);
    setDailyResults(null);
    setDailyMessage('');
    try {
      const res = await fetch('/api/generate/daily', { method: 'POST' });
      const data = await res.json();
      setDailyMessage(data.message || data.error || 'Unknown result');
      setDailyResults(data.results || []);
      if (data.success) {
        fetchDashboard();
      }
    } catch (e) {
      setDailyMessage('请求失败，请检查网络');
      console.error(e);
    }
    setDailyGenerating(false);
  };

  const handleProcessQueue = async () => {
    const res = await fetch('/api/publish', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`已发布 ${data.published} 篇文章`);
      fetchQueue();
      fetchDashboard();
    }
  };

  // ===== MAIN ADMIN UI =====
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Swords className="h-7 w-7 text-purple-400" />
          <h1 className="text-2xl font-black font-display gradient-text">3A Game Master</h1>
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard icon={BookOpen} label="文章总数" value={stats.totalArticles} color="text-purple-400" />
              <StatCard icon={Target} label="待审核" value={stats.pendingReview} color="text-amber-400" highlight={stats.pendingReview > 0} />
              <StatCard icon={CheckCircle} label="待发布" value={stats.readyToPublish} color="text-cyan-400" />
              <StatCard icon={TrendingUp} label="今日发布" value={stats.todayPublished} color="text-green-400" />
              <StatCard icon={Zap} label="本周生成" value={stats.weekGenerated} color="text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard icon={Activity} label="生成成功率" value={`${stats.generationSuccessRate}%`} color="text-green-400" />
              <StatCard icon={Calendar} label="今日调度" value={stats.todayScheduled} color="text-amber-400" />
              <StatCard icon={Swords} label="游戏总数" value={stats.totalGames} color="text-amber-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                          <div className="w-full rounded-t bg-gradient-to-t from-green-600 to-green-400 transition-all" style={{ height: `${height}%` }} />
                          <span className="text-[10px] text-muted-foreground">{item.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无发布数据</p>
                )}
              </div>

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
                          <div className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all" style={{ height: `${height}%` }} />
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
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${stats.totalArticles > 0 ? (count / stats.totalArticles) * 100 : 0}%` }} />
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

            <div className="game-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">发布队列</h3>
                <button onClick={handleProcessQueue} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-all">
                  <Play className="h-3 w-3" />立即执行
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

        {/* ===== 流量报表 Tab ===== */}
        {activeTab === 'analytics' && (
          <div>
            {analyticsLoading && !analytics ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <span className="ml-3 text-muted-foreground">加载流量数据...</span>
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointerClick className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs text-muted-foreground">今日浏览量</span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">{analytics.today.pageViews.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">UV: {analytics.today.uniqueVisitors.toLocaleString()}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-muted-foreground">昨日浏览量</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-400">{analytics.yesterday.pageViews.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      UV: {analytics.yesterday.uniqueVisitors.toLocaleString()}
                      {analytics.yesterday.pageViews > 0 && analytics.today.pageViews > 0 && (
                        <span className={`ml-2 ${analytics.today.pageViews >= analytics.yesterday.pageViews ? 'text-green-400' : 'text-red-400'}`}>
                          {analytics.today.pageViews >= analytics.yesterday.pageViews ? '↑' : '↓'}
                          {Math.abs(Math.round((analytics.today.pageViews - analytics.yesterday.pageViews) / analytics.yesterday.pageViews * 100))}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-muted-foreground">7天日均</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">{analytics.weekAvg.pageViews.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">日均UV: {analytics.weekAvg.uniqueVisitors.toLocaleString()}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-amber-400" />
                      <span className="text-xs text-muted-foreground">累计浏览量</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{analytics.total.pageViews.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">累计UV: {analytics.total.uniqueVisitors.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">30天流量趋势</h3>
                  <div className="flex items-end gap-[3px] h-48">
                    {analytics.thirtyDayTrend.map((d, i) => {
                      const maxPv = Math.max(...analytics.thirtyDayTrend.map(t => t.pageViews), 1);
                      const pvH = Math.max((d.pageViews / maxPv) * 100, 2);
                      const maxUv = Math.max(...analytics.thirtyDayTrend.map(t => t.uniqueVisitors), 1);
                      const uvH = Math.max((d.uniqueVisitors / maxUv) * 100, 2);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-[2px] group relative">
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover border border-border rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10 shadow-lg">
                            <div className="font-semibold">{d.date}</div>
                            <div className="text-cyan-400">PV: {d.pageViews}</div>
                            <div className="text-purple-400">UV: {d.uniqueVisitors}</div>
                          </div>
                          <div className="w-full bg-cyan-500/70 rounded-t-sm transition-all" style={{ height: `${pvH}%` }} />
                          <div className="w-full bg-purple-500/50 rounded-t-sm transition-all" style={{ height: `${uvH}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-cyan-500/70" />浏览量 PV</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-purple-500/50" />独立访客 UV</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-cyan-400" />热门页面（7天）
                    </h3>
                    <div className="space-y-2">
                      {analytics.topPages.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">暂无数据</div>
                      ) : analytics.topPages.slice(0, 10).map((p, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                          <span className="text-sm text-foreground truncate flex-1" title={p.path}>{p.path}</span>
                          <span className="text-xs text-cyan-400 font-mono">{p.views}</span>
                          <span className="text-xs text-muted-foreground font-mono">UV:{p.uniqueVisitors}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-400" />攻略流量排行（7天）
                    </h3>
                    <div className="space-y-2">
                      {analytics.topGuides.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">暂无数据</div>
                      ) : analytics.topGuides.slice(0, 10).map((g, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                          <span className="text-sm text-foreground truncate flex-1" title={g.title}>{g.title || g.path}</span>
                          <span className="text-xs text-purple-400 font-mono">{g.views}</span>
                          <span className="text-xs text-muted-foreground font-mono">UV:{g.uniqueVisitors}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-green-400" />访问来源（7天）
                    </h3>
                    <div className="space-y-2">
                      {analytics.topReferrers.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">暂无数据</div>
                      ) : analytics.topReferrers.slice(0, 10).map((r, i) => {
                        const maxViews = analytics.topReferrers[0]?.views || 1;
                        const barW = Math.max((r.views / maxViews) * 100, 3);
                        return (
                          <div key={i} className="flex items-center gap-3 py-1">
                            <span className="text-sm text-foreground truncate flex-1" title={r.source}>{r.source}</span>
                            <div className="w-24 h-4 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${barW}%` }} />
                            </div>
                            <span className="text-xs text-green-400 font-mono w-10 text-right">{r.views}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-400" />地区分布（7天）
                    </h3>
                    <div className="space-y-2">
                      {analytics.topCountries.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">暂无数据</div>
                      ) : analytics.topCountries.slice(0, 10).map((c, i) => {
                        const maxViews = analytics.topCountries[0]?.views || 1;
                        const barW = Math.max((c.views / maxViews) * 100, 3);
                        return (
                          <div key={i} className="flex items-center gap-3 py-1">
                            <span className="text-sm text-foreground w-16">{c.region}</span>
                            <div className="flex-1 h-4 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${barW}%` }} />
                            </div>
                            <span className="text-xs text-amber-400 font-mono">{c.views}</span>
                            <span className="text-xs text-muted-foreground font-mono">UV:{c.uniqueVisitors}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button onClick={() => fetchAnalytics()} disabled={analyticsLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground hover:border-purple-500/50 transition-all disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />刷新数据
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ===== 每日生成 Tab ===== */}
        {activeTab === 'daily' && (
          <div>
            <div className="game-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-6 w-6 text-purple-400" />
                <div>
                  <h3 className="text-lg font-bold font-display gradient-text">每日自动生成</h3>
                  <p className="text-xs text-muted-foreground mt-1">一键为所有游戏各生成2篇攻略，自动生成封面图并直接发布</p>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-4 mb-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">执行逻辑</h4>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />遍历数据库中的所有游戏</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />每个游戏生成2篇攻略（优先覆盖文章少的攻略类型）</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />5种模板：Boss攻略 / Build配装 / 收集指南 / 流程攻略 / 技巧提示</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />自动生成封面图并上传CDN</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />直接发布，无需人工审核</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />每天只能执行一次，防止重复生成</li>
                </ul>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-5">
                <p className="text-xs text-amber-300/80">
                  每日触发链接：<code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">POST https://3agamemaster.com/api/generate/daily</code>
                  <br />也可用 curl 触发：<code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">curl -X POST https://3agamemaster.com/api/generate/daily</code>
                </p>
              </div>

              <button
                onClick={handleDailyGenerate}
                disabled={dailyGenerating}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dailyGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />生成中，请耐心等待（约2-5分钟）...</>
                ) : (
                  <><Zap className="h-4 w-4" />立即执行每日生成</>
                )}
              </button>
            </div>

            {dailyMessage && (
              <div className={`game-card p-4 mb-4 ${dailyResults && dailyResults.some(r => r.status === 'failed') ? 'border-amber-500/30' : 'border-green-500/30'}`}>
                <p className={`text-sm font-semibold ${dailyMessage.includes('already ran') ? 'text-amber-400' : 'text-green-400'}`}>{dailyMessage}</p>
              </div>
            )}

            {dailyResults && dailyResults.length > 0 && (
              <div className="game-card p-6">
                <h3 className="text-sm font-semibold font-display text-foreground mb-4">生成结果明细</h3>
                <div className="space-y-2">
                  {dailyResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border">
                      <span className="text-sm">{getGuideTypeIcon(r.guideType)}</span>
                      <span className="text-xs text-purple-400 font-medium w-20 truncate">{r.game}</span>
                      <span className="text-sm text-foreground truncate flex-1">{r.title || r.topic}</span>
                      <span className={`text-xs font-semibold ${r.status === 'published' ? 'text-green-400' : 'text-red-400'}`}>
                        {r.status === 'published' ? '已发布' : '失败'}
                      </span>
                      {r.error && <span className="text-xs text-red-400/70 truncate max-w-[200px]" title={r.error}>{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 文章管理 Tab ===== */}
        {activeTab === 'articles' && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-sm text-muted-foreground">筛选：</span>
              {[
                { key: '', label: '全部' },
                { key: 'published', label: '已发布' },
                { key: 'generated', label: '已生成' },
                { key: 'reviewed', label: '已审核' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === s.key
                      ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <div className="ml-auto text-xs text-muted-foreground">共 {articles.length} 篇</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <div key={article.id} className="game-card p-4">
                    <div className="flex items-start gap-3">
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
                          {article.published_at && (
                            <span className="text-green-400">已发布于 {new Date(article.published_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
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

        {/* ===== 发布调度 Tab ===== */}
        {activeTab === 'schedule' && (
          <div>
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

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold font-display tracking-wide text-foreground">发布队列（{queue.length} 条）</h3>
              <button onClick={handleProcessQueue} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition-all">
                <Play className="h-4 w-4" />执行到期任务
              </button>
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
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getQueueStatusBadge(item.status)}`}>
                        {getQueueStatusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">队列为空</p>
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

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
