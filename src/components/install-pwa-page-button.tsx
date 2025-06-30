
"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function InstallPwaPageButton() {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) {
    return null;
  }

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    promptInstall();
  };

  // Use the secondary variant to make it less prominent than primary actions
  return (
    <Button variant="secondary" className="w-full mt-2" onClick={handleInstallClick}>
      <Download className="mr-2 h-4 w-4" />
      Install App
    </Button>
  );
}
