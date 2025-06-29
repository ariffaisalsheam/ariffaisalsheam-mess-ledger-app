"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, PlusCircle, Users } from "lucide-react";
import { Logo } from "@/components/logo";

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-4xl font-bold font-headline text-primary">Welcome to Xapps!</h1>
            <p className="mt-2 text-lg text-muted-foreground">Let's get you set up. What would you like to do?</p>
        </div>
        <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <PlusCircle className="h-6 w-6 text-primary"/>
                    </div>
                    <CardTitle className="font-headline text-2xl">Create a New Mess</CardTitle>
                    <CardDescription>Start from scratch, invite your friends, and become the manager of your own mess.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/create-mess" className="w-full">
                        <Button className="w-full">
                            Create a Mess <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardFooter>
            </Card>

            <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-6 w-6 text-primary"/>
                    </div>
                    <CardTitle className="font-headline text-2xl">Join an Existing Mess</CardTitle>
                    <CardDescription>Already have an invite code or a magic link? Join your friends and start managing meals.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/join-mess" className="w-full">
                        <Button className="w-full">
                            Join a Mess <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
