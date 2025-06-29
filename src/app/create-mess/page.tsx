"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ArrowLeft, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { createMess } from "@/services/messService";
import { useToast } from "@/hooks/use-toast";

export default function CreateMessPage() {
  const [messName, setMessName] = useState("");
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
    if (messName.trim() && user) {
      setSubmitting(true);
      try {
        await createMess(messName.trim(), user);
        toast({
          title: "Success!",
          description: `Your mess "${messName.trim()}" has been created.`,
        });
        router.push("/dashboard");
      } catch (error) {
        console.error("Failed to create mess:", error);
        toast({
          title: "Error",
          description: "Could not create your mess. Please try again.",
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
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Logo />
            </div>
            <CardTitle className="text-2xl font-headline">Create Your MessX</CardTitle>
            <CardDescription>Give your new mess a name to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="mess-name">Mess Name</Label>
              <Input
                id="mess-name"
                placeholder="e.g., 'Bachelors Paradise'"
                required
                value={messName}
                onChange={(e) => setMessName(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!messName.trim() || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create and Go to Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
