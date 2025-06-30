
"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function InstallPwaNavButton() {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) {
    return null;
  }

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    promptInstall();
  };

  return (
    <button
      onClick={handleInstallClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      )}
    >
      <Download className="h-5 w-5" />
      <span>Install App</span>
    </button>
  );
}
