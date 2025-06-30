"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function InstallPwaButton() {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) {
    return null;
  }

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    promptInstall();
  }

  // Render as a DropdownMenuItem to be used inside the user menu.
  return (
    <DropdownMenuItem onSelect={handleInstallClick} className="cursor-pointer">
      <Download className="mr-2 h-4 w-4" />
      <span>Install App</span>
    </DropdownMenuItem>
  );
}
