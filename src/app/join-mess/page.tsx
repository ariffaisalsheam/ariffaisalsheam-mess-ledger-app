"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ArrowLeft, Loader2 } from "lucide-react";
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { joinMessByInviteCode } from '@/services/messService';
import { useToast } from '@/hooks/use-toast';

export default function JoinMessPage() {
    const [inviteCode, setInviteCode] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth) {
            router.push('/login');
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push("/login");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inviteCode.trim() && user) {
            setSubmitting(true);
            try {
                await joinMessByInviteCode(inviteCode.trim().toUpperCase(), user);
                toast({
                    title: "Success!",
                    description: "You've successfully joined the mess.",
                });
                router.push("/dashboard");
            } catch (error: any) {
                console.error("Failed to join mess:", error);
                toast({
                    title: "Error",
                    description: error.message || "Could not join the mess. Please check the code and try again.",
                    variant: "destructive",
                });
            } finally {
                setSubmitting(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="absolute left-4 top-4 md:left-8 md:top-8">
            <Link href="/welcome">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </Link>
        </div>
      <Card className="mx-auto w-full max-w-sm border-0 shadow-lg md:border">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Logo />
            </div>
            <CardTitle className="text-2xl font-headline">KhanaConnect</CardTitle>
            <CardDescription>Transparent Tracking, Effortless Settlement</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold">Join a Mess</h3>
                <p className="text-sm text-muted-foreground">Enter your invite code to join an existing mess.</p>
            </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="Paste your code here"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="uppercase"
                autoCapitalize="characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!inviteCode.trim() || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join and Go to Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
