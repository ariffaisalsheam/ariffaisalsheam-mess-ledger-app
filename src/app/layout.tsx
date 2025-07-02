import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from 'react';
import React from 'react'; // Explicitly import React
import { Analytics } from "@/components/analytics";
import InstallPromptBanner from "@/components/features/InstallPromptBanner";
import { PwaInstallProvider } from "@/components/pwa-install-wrapper"; // Import PwaInstallProvider

export const metadata: Metadata = {
  title: 'Mess Ledger',
  description: 'Transparent Tracking, Effortless Settlement.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#008080" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <PwaInstallProvider>
            {children}
            <InstallPromptBanner /> {/* Move banner inside provider */}
          </PwaInstallProvider>
          <Toaster />
        </ThemeProvider>
        <Suspense fallback={null}>
            <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
