"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ArrowLeft } from "lucide-react";

export default function JoinMessPage() {
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
            <CardTitle className="text-2xl font-headline">Join a Mess</CardTitle>
            <CardDescription>Enter your invite code to join an existing mess.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-code">Magic Link or Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="Paste your code here"
                required
              />
            </div>
            <Link href="/dashboard" passHref>
                <Button type="submit" className="w-full">
                    Join and Go to Dashboard
                </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
