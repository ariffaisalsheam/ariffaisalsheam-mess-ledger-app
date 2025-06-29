
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Users, LogOut, Settings as SettingsIcon, Loader2 } from "lucide-react";
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
import { ProfileEditor } from "@/components/profile-editor";

export default function WelcomePage() {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
    const router = useRouter();

    const fetchProfile = useCallback(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setLoading(true);
            getUserProfile(currentUser.uid).then((profile) => {
                setUserProfile(profile);
                setLoading(false);
            });
        }
    }, []);

    useEffect(() => {
        if (!auth) {
          router.push('/login');
          return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchProfile();
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router, fetchProfile]);
    
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
    <>
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 relative">
          <div className="absolute top-4 right-4">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                          <Avatar className="h-10 w-10">
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
                      <DropdownMenuItem onSelect={() => setProfileDialogOpen(true)} className="cursor-pointer">
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

          <Card className="w-full max-w-lg border-0 shadow-lg md:border">
            <CardHeader className="text-center p-6">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="font-headline text-3xl">Welcome to KhanaConnect</CardTitle>
                <CardDescription>
                    You're not part of a mess yet, <span className="font-semibold text-foreground">{userProfile?.displayName || 'Friend'}</span>!
                    <br/>
                    Create one or join an existing one to get started.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex flex-col md:flex-row gap-4">
                <Link href="/create-mess" className="w-full">
                    <Button className="w-full h-auto flex-col items-start p-4 text-left transition-transform hover:scale-[1.02] justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <PlusCircle className="h-5 w-5"/>
                                <span className="font-bold text-base">Create a New Mess</span>
                            </div>
                            <span className="text-sm font-normal text-primary-foreground/80 pl-8">Start from scratch and invite friends.</span>
                        </div>
                    </Button>
                </Link>
                <Link href="/join-mess" className="w-full">
                    <Button variant="secondary" className="w-full h-auto flex-col items-start p-4 text-left transition-transform hover:scale-[1.02] justify-between">
                         <div>
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5"/>
                                <span className="font-bold text-base">Join an Existing Mess</span>
                            </div>
                            <span className="text-sm font-normal text-secondary-foreground/80 pl-8">Use an invite code to join a mess.</span>
                        </div>
                    </Button>
                </Link>
            </CardContent>
          </Card>
      </div>
      <Dialog open={isProfileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-xl p-0">
          <DialogTitle className="sr-only">Personal Information</DialogTitle>
          <DialogDescription className="sr-only">Update your name and profile picture.</DialogDescription>
          <ProfileEditor 
            userProfile={userProfile}
            onProfileUpdate={fetchProfile}
            onSaveComplete={() => setProfileDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
