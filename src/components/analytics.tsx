"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { app } from '@/lib/firebase';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    isSupported().then(supported => {
        if (!supported || !app) return;

        const analytics = getAnalytics(app);
        
        const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        
        logEvent(analytics, 'page_view', {
            page_path: url,
            page_location: window.location.href,
            page_title: document.title,
        });
    });
  }, [pathname, searchParams]);

  return null;
}
