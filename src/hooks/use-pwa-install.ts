"use client";

import { useState, useEffect } from 'react';

// This interface is a subset of the actual BeforeInstallPromptEvent
// to make it easier to work with and avoid type errors.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePwaInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      // Cast the generic event to our specific interface
      // Add a small timeout to allow other components to render first
      setTimeout(() => {
        setInstallPrompt(event as BeforeInstallPromptEvent);
      }, 50); // 50ms delay
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      console.log('PWA install prompt not available.');
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    // The prompt can only be used once. Clear it.
    setInstallPrompt(null);
  };

  return { isInstallable: !!installPrompt, promptInstall };
};
