
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, Smartphone, Laptop, CheckCircle, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InstallPage() {
  const { canInstall, promptInstall } = usePwaInstall();
  const router = useRouter();

  const handleInstallClick = () => {
    if (canInstall) {
      promptInstall();
    }
  };

  const benefits = [
    {
      icon: <Laptop className="h-6 w-6 text-primary" />,
      title: "Desktop & Mobile Access",
      description: "Install on your computer or phone for a native app experience."
    },
    {
      icon: <WifiOff className="h-6 w-6 text-primary" />,
      title: "Offline Functionality",
      description: "Access your ledger and key features even without an internet connection."
    },
    {
      icon: <Smartphone className="h-6 w-6 text-primary" />,
      title: "Seamless Experience",
      description: "Enjoy a faster, full-screen experience without browser toolbars."
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">Install Mess Ledger App</CardTitle>
          <CardDescription>
            Get a faster, more reliable experience by installing the app on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-8">
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4">
                {benefit.icon}
                <div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {canInstall ? (
            <Button size="lg" className="w-full" onClick={handleInstallClick}>
              <Download className="mr-2 h-5 w-5" />
              Install App
            </Button>
          ) : (
             <div className="flex flex-col items-center gap-4 pt-4">
                <div className="flex items-center gap-2 text-lg font-medium text-success">
                    <CheckCircle className="h-6 w-6" />
                    <p>App is already installed!</p>
                </div>
                <p className="text-muted-foreground text-sm max-w-md">
                    If not, your browser may not support PWA installation. Try using Chrome, Edge, or Safari on a mobile device for the best experience.
                </p>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                </Button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
