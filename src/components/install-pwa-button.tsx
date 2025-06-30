
"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export function InstallPwaButton() {
  const router = useRouter();

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/dashboard/install');
  }

  // Render as a DropdownMenuItem to be used inside the user menu.
  return (
    <DropdownMenuItem onSelect={handleInstallClick} className="cursor-pointer">
      <Download className="mr-2 h-4 w-4" />
      <span>Install App</span>
    </DropdownMenuItem>
  );
}
