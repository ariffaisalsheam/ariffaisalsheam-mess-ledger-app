"use client";

import { useState, useEffect } from 'react';
import { usePwaInstallContext } from "@/components/pwa-install-wrapper";
import { Button } from "@/components/ui/button";
import { Download, X } from 'lucide-react';

export default function InstallPromptBanner() {
  const { isInstallable, promptInstall } = usePwaInstallContext();
  const [isDismissed, setIsDismissed] = useState(false);

  // On component mount, check if the user has previously dismissed the banner
  useEffect(() => {
    const dismissed = localStorage.getItem('pwaInstallBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleInstallClick = () => {
    promptInstall();
  };

  const handleDismissClick = () => {
    // Hide the banner for the current session and remember the choice in localStorage
    setIsDismissed(true);
    localStorage.setItem('pwaInstallBannerDismissed', 'true');
  };

  // The component will only render if the app is installable AND the user hasn't dismissed it before
  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-background border shadow-lg rounded-lg p-4 z-50 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-10">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Install Mess Ledger</p>
          <p className="text-xs text-muted-foreground">Get faster access & offline mode.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleInstallClick}>
          Install
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismissClick}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
