"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, PlusCircle, Users, LogOut, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getUserProfile, type UserProfile } from "@/services/messService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WelcomePage() {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!auth) {
          router.push('/login');
          return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                getUserProfile(currentUser.uid).then((profile) => {
                    setUserProfile(profile);
                    setLoading(false);
                });
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    const handleLogout = async () => {
        if (auth) {
            await auth.signOut();
            router.push('/login');
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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 relative">
        <div className="absolute top-4 right-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={userProfile?.photoURL ?? "https://placehold.co/40x40.png"} alt={userProfile?.displayName ?? "User"} data-ai-hint="person portrait" />
                            <AvatarFallback>{userProfile?.displayName?.substring(0, 2).toUpperCase() ?? "U"}</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userProfile?.displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4"/>
                        <span>Logout</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-4xl font-bold font-headline text-primary">Welcome{userProfile?.displayName ? `, ${userProfile.displayName}` : ' to KhanaConnect'}!</h1>
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
