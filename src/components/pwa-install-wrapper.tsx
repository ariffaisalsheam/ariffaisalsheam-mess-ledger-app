"use client";

import React, { createContext, useContext } from 'react';
import { usePwaInstall } from '@/hooks/use-pwa-install';

interface PwaInstallContextType {
  isInstallable: boolean;
  promptInstall: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextType | undefined>(undefined);

export const PwaInstallProvider = ({ children }: { children: React.ReactNode }) => {
  const { isInstallable, promptInstall } = usePwaInstall();

  return (
    <PwaInstallContext.Provider value={{ isInstallable, promptInstall }}>
      {children}
    </PwaInstallContext.Provider>
  );
};

export const usePwaInstallContext = () => {
  const context = useContext(PwaInstallContext);
  if (context === undefined) {
    throw new Error('usePwaInstallContext must be used within a PwaInstallProvider');
  }
  return context;
};
