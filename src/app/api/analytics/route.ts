import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // ===== 实时数据：今天 =====
    const todayResult = await query(`
      SELECT 
        COUNT(*) as page_views,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM page_views 
      WHERE visited_at >= CURRENT_DATE
    `);
    const today = todayResult.rows[0];

    // ===== 昨日数据 =====
    const yesterdayResult = await query(`
      SELECT 
        COUNT(*) as page_views,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM page_views 
      WHERE visited_at >= CURRENT_DATE - INTERVAL '1 day'
        AND visited_at < CURRENT_DATE
    `);
    const yesterday = yesterdayResult.rows[0];

    // ===== 30天趋势 =====
    const trendResult = await query(`
      SELECT 
        DATE(visited_at) as date,
        COUNT(*) as page_views,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM page_views
      WHERE visited_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY DATE(visited_at)
      ORDER BY date ASC
    `);

    // 填充30天空白天
    const trendMap = new Map<string, { page_views: string; unique_visitors: string }>();
    for (const row of trendResult.rows) {
      trendMap.set(row.date, { page_views: row.page_views, unique_visitors: row.unique_visitors });
    }
    const thirtyDayTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const data = trendMap.get(dateStr);
      thirtyDayTrend.push({
        date: dateStr,
        pageViews: data ? parseInt(data.page_views) : 0,
        uniqueVisitors: data ? parseInt(data.unique_visitors) : 0,
      });
    }

    // ===== TOP 20 热门页面（7天） =====
    const topPagesResult = await query(`
      SELECT 
        path,
        COUNT(*) as views,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM page_views
      WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 20
    `);

    // ===== TOP 10 来源（7天） =====
    const topReferrersResult = await query(`
      SELECT 
        CASE 
          WHEN referrer = '' OR referrer IS NULL THEN '直接访问'
          ELSE referrer
        END as source,
        COUNT(*) as views
      FROM page_views
      WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY source
      ORDER BY views DESC
      LIMIT 10
    `);

    // ===== TOP 10 国家/地区（7天） =====
    const topCountriesResult = await query(`
      SELECT 
        CASE 
          WHEN country = '' OR country IS NULL THEN '未知'
          ELSE country
        END as region,
        COUNT(*) as views,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM page_views
      WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY region
      ORDER BY views DESC
      LIMIT 10
    `);

    // ===== 总计数据 =====
    const totalResult = await query(`
      SELECT 
        COUNT(*) as total_page_views,
        COUNT(DISTINCT ip_hash) as total_unique_visitors
      FROM page_views
    `);
    const total = totalResult.rows[0];

    // ===== 7天平均 =====
    const weekAvgResult = await query(`
      SELECT 
        ROUND(AVG(daily_pv)::numeric, 0) as avg_page_views,
        ROUND(AVG(daily_uv)::numeric, 0) as avg_unique_visitors
      FROM (
        SELECT 
          DATE(visited_at) as d,
          COUNT(*) as daily_pv,
          COUNT(DISTINCT ip_hash) as daily_uv
        FROM page_views
        WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(visited_at)
      ) sub
    `);
    const weekAvg = weekAvgResult.rows[0];

    // ===== 攻略详情页流量TOP10（7天） =====
    const topGuidesResult = await query(`
      SELECT 
        pv.path,
        pv.views,
        pv.unique_visitors,
        a.title,
        a.slug
      FROM (
        SELECT 
          path,
          COUNT(*) as views,
          COUNT(DISTINCT ip_hash) as unique_visitors
        FROM page_views
        WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days'
          AND path LIKE '/guides/%'
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      ) pv
      LEFT JOIN articles a ON CONCAT('/guides/', a.slug) = pv.path
      ORDER BY pv.views DESC
    `);

    return NextResponse.json({
      today: {
        pageViews: parseInt(today.page_views) || 0,
        uniqueVisitors: parseInt(today.unique_visitors) || 0,
      },
      yesterday: {
        pageViews: parseInt(yesterday.page_views) || 0,
        uniqueVisitors: parseInt(yesterday.unique_visitors) || 0,
      },
      total: {
        pageViews: parseInt(total.total_page_views) || 0,
        uniqueVisitors: parseInt(total.total_unique_visitors) || 0,
      },
      weekAvg: {
        pageViews: parseInt(weekAvg.avg_page_views) || 0,
        uniqueVisitors: parseInt(weekAvg.avg_unique_visitors) || 0,
      },
      thirtyDayTrend,
      topPages: topPagesResult.rows.map((r: Record<string, string>) => ({
        path: r.path,
        views: parseInt(r.views),
        uniqueVisitors: parseInt(r.unique_visitors),
      })),
      topReferrers: topReferrersResult.rows.map((r: Record<string, string>) => ({
        source: r.source.length > 80 ? r.source.slice(0, 80) + '...' : r.source,
        views: parseInt(r.views),
      })),
      topCountries: topCountriesResult.rows.map((r: Record<string, string>) => ({
        region: r.region,
        views: parseInt(r.views),
        uniqueVisitors: parseInt(r.unique_visitors),
      })),
      topGuides: topGuidesResult.rows.map((r: Record<string, string>) => ({
        path: r.path,
        title: r.title || r.path,
        views: parseInt(r.views),
        uniqueVisitors: parseInt(r.unique_visitors),
      })),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: '获取流量数据失败' }, { status: 500 });
  }
}
