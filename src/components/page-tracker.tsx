'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 不追踪admin和api页面
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    const trackPageView = async () => {
      try {
        const fullPath = searchParams.toString() 
          ? `${pathname}?${searchParams.toString()}`
          : pathname;
        
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: fullPath,
            referrer: document.referrer || '',
          }),
        });
      } catch {
        // 静默失败
      }
    };

    // 延迟发送，不阻塞页面渲染
    const timer = setTimeout(trackPageView, 1000);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
