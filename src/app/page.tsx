"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 2500); // 2.5-second delay

    return () => clearTimeout(timer); // Cleanup the timer
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background animate-fadeIn">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <h1 className="text-5xl font-bold font-headline text-primary">
          KhanaConnect
        </h1>
        <p className="text-lg font-semibold text-muted-foreground">
          Transparent Tracking, Effortless Settlement
        </p>
      </div>
      <div className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>Version 1.0.0</p>
        <p>&copy; 2025 Xapps. All rights reserved.</p>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 1.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
