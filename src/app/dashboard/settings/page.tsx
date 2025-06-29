"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Share2, UserCog, ShieldAlert, Loader2, Save } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    getMessById, 
    getUserProfile, 
    updateMealSettings, 
    getMembersOfMess,
    transferManagerRole,
    updateMessName,
    deleteMess,
    type UserProfile as AppUserProfile, 
    type MealSettings,
    type Member
} from '@/services/messService';
import { ProfileEditor } from '@/components/profile-editor';


interface MessData {
    id: string;
    name: string;
    inviteCode?: string;
    mealSettings?: MealSettings;
}

export default function SettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    
    const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
    const [messData, setMessData] = useState<MessData | null>(null);
    const [messName, setMessName] = useState('');
    const [isSavingMessName, setIsSavingMessName] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transferInput, setTransferInput] = useState("");
    const [deleteInput, setDeleteInput] = useState("");
    const [mealSettings, setMealSettings] = useState<MealSettings>({
        breakfastCutoff: "02:00",
        lunchCutoff: "13:00",
        dinnerCutoff: "20:00",
        isBreakfastOn: true,
        isLunchOn: true,
        isDinnerOn: true,
        isCutoffEnabled: true,
    });

    const fetchData = useCallback(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            router.push('/login');
            return;
        };

        setLoading(true);
        getUserProfile(currentUser.uid).then(profile => {
            setUserProfile(profile);
            if (profile) {
                if (profile.messId) {
                    Promise.all([
                        getMessById(profile.messId),
                        profile.role === 'manager' ? getMembersOfMess(profile.messId) : Promise.resolve([])
                    ]).then(([mess, fetchedMembers]) => {
                        if (mess) {
                            setMessData(mess as MessData);
                            setMessName(mess.name);
                            if (mess.mealSettings) {
                                setMealSettings(prev => ({...prev, ...mess.mealSettings}));
                            }
                        }
                        if (profile.role === 'manager') {
                            setMembers(fetchedMembers.filter(m => m.id !== currentUser.uid));
                        }
                    }).catch(err => {
                        console.error("Failed to load settings data", err);
                        toast({ title: "Error", description: "Could not load settings data.", variant: "destructive" });
                    });
                } else if (window.location.pathname.startsWith('/dashboard')) {
                    router.push('/welcome');
                }
            } else {
                auth.signOut();
                router.push('/login');
            }
        }).finally(() => {
            setLoading(false);
        });
    }, [toast, router]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchData();
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [fetchData, router]);
    
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setMealSettings(prev => ({...prev, [id]: value }));
    }

    const handleSaveMealSettings = async () => {
        if (!messData?.id) return;
        setIsSaving(true);
        try {
            await updateMealSettings(messData.id, mealSettings);
            toast({ title: "Success!", description: "Meal settings have been updated." });
        } catch (error) {
            console.error("Failed to save meal settings:", error);
            toast({ title: "Error", description: "Could not save settings. Please try again.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleSaveMessName = async () => {
        if (!messData?.id || !messName.trim()) return;
        if (messName.trim() === messData.name) return;
    
        setIsSavingMessName(true);
        try {
            await updateMessName(messData.id, messName.trim());
            toast({ title: "Success!", description: "Mess name has been updated." });
            fetchData();
        } catch (error) {
            console.error("Failed to save mess name:", error);
            toast({ title: "Error", description: "Could not save mess name.", variant: "destructive" });
        } finally {
            setIsSavingMessName(false);
        }
    }

    const handleCopy = () => {
        if (!messData?.inviteCode) return;
        navigator.clipboard.writeText(messData.inviteCode);
        toast({
            title: "Copied!",
            description: "Invite code copied to clipboard.",
        });
    }

    const handleTransferManager = async (newManagerId: string, newManagerName: string) => {
        if (!messData?.id || !userProfile?.uid) return;
        setIsSubmitting(true);
        try {
            await transferManagerRole(messData.id, userProfile.uid, newManagerId);
            toast({ title: "Success!", description: `Manager role has been transferred to ${newManagerName}.`});
            router.push('/dashboard');
        } catch(error: any) {
            toast({ title: "Error", description: error.message || "Failed to transfer role.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setTransferInput("");
        }
    };

    const handleDeleteMess = async () => {
        if (!messData?.id) return;
        setIsSubmitting(true);
        try {
            await deleteMess(messData.id);
            toast({ title: "Success!", description: "The mess has been permanently deleted." });
            router.push('/welcome');
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete the mess.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setDeleteInput("");
        }
    };

    if (loading) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
    }

    const isManager = userProfile?.role === 'manager';

  return (
    <div className="space-y-8">
        <ProfileEditor userProfile={userProfile} onProfileUpdate={() => {
            fetchData();
        }} />

      {isManager && messData ? (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Mess Information</CardTitle>
                    <CardDescription>Update your mess's general details and invite codes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mess-name">Mess Name</Label>
                        <Input id="mess-name" value={messName} onChange={(e) => setMessName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invite-code">Mess Invite Code</Label>
                        <div className="flex gap-2">
                            <Input id="invite-code" readOnly value={messData?.inviteCode || 'N/A'} className="font-mono tracking-widest" />
                            <Button variant="outline" size="icon" onClick={handleCopy} disabled={!messData?.inviteCode}><Copy className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-6">
                    <Button onClick={handleSaveMessName} disabled={isSavingMessName || messName.trim() === messData.name}>
                        {isSavingMessName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Mess Name
                    </Button>
                </CardFooter>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Meal Settings</CardTitle>
                    <CardDescription>Enable or disable meals, and set cut-off times. Members can only toggle meals that are ON.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 border-b pb-4 mb-6">
                        <Switch
                            id="isCutoffEnabled"
                            checked={mealSettings.isCutoffEnabled}
                            onCheckedChange={(checked) => setMealSettings(prev => ({ ...prev, isCutoffEnabled: checked }))}
                        />
                        <Label htmlFor="isCutoffEnabled" className="text-base">Enable Meal Cut-off Times</Label>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="isBreakfastOn" className="font-medium">Breakfast</Label>
                                <Switch
                                    id="isBreakfastOn"
                                    checked={mealSettings.isBreakfastOn}
                                    onCheckedChange={(checked) => setMealSettings(prev => ({ ...prev, isBreakfastOn: checked }))}
                                />
                            </div>
                            <Label htmlFor="breakfastCutoff" className="text-sm text-muted-foreground">Cut-off Time</Label>
                            <Input id="breakfastCutoff" type="time" value={mealSettings.breakfastCutoff} onChange={handleSettingsChange} disabled={!mealSettings.isBreakfastOn || !mealSettings.isCutoffEnabled} />
                        </div>
                        <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                <Label htmlFor="isLunchOn" className="font-medium">Lunch</Label>
                                <Switch
                                    id="isLunchOn"
                                    checked={mealSettings.isLunchOn}
                                    onCheckedChange={(checked) => setMealSettings(prev => ({ ...prev, isLunchOn: checked }))}
                                />
                            </div>
                            <Label htmlFor="lunchCutoff" className="text-sm text-muted-foreground">Cut-off Time</Label>
                            <Input id="lunchCutoff" type="time" value={mealSettings.lunchCutoff} onChange={handleSettingsChange} disabled={!mealSettings.isLunchOn || !mealSettings.isCutoffEnabled} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="isDinnerOn" className="font-medium">Dinner</Label>
                                <Switch
                                    id="isDinnerOn"
                                    checked={mealSettings.isDinnerOn}
                                    onCheckedChange={(checked) => setMealSettings(prev => ({ ...prev, isDinnerOn: checked }))}
                                />
                            </div>
                            <Label htmlFor="dinnerCutoff" className="text-sm text-muted-foreground">Cut-off Time</Label>
                            <Input id="dinnerCutoff" type="time" value={mealSettings.dinnerCutoff} onChange={handleSettingsChange} disabled={!mealSettings.isDinnerOn || !mealSettings.isCutoffEnabled} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSaveMealSettings} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Meal Settings
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="font-headline">Manager Transfer</CardTitle>
                <CardDescription>Transfer manager role to another member of the mess. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                   {members.length > 0 ? members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                             <p className="font-medium">{member.name}</p>
                             <AlertDialog onOpenChange={() => setTransferInput("")}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isSubmitting}>
                                        <UserCog className="mr-2 h-4 w-4"/> Make Manager
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle className="font-headline flex items-center"><ShieldAlert className="mr-2 text-yellow-500" />Transfer Manager Role?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to make <strong>{member.name}</strong> the new manager. You will immediately lose all manager privileges. This action cannot be undone.
                                        <br/><br/>
                                        To confirm, please type <strong>TRANSFER</strong> in the box below.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Input 
                                        placeholder="Type TRANSFER to confirm" 
                                        value={transferInput}
                                        onChange={(e) => setTransferInput(e.target.value)}
                                    />
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                        disabled={transferInput !== "TRANSFER" || isSubmitting}
                                        onClick={() => handleTransferManager(member.id, member.name)}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirm Transfer
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                   )) : (
                       <p className="text-sm text-muted-foreground text-center py-4">There are no other members to transfer the role to.</p>
                   )}
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Delete this Mess</p>
                        <p className="text-sm text-muted-foreground">Once you delete a Mess, there is no going back. Please be certain.</p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Delete Mess</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-headline">Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the <strong>{messData?.name}</strong> mess and all of its data.
                                    <br/><br/>
                                    To confirm, please type <strong>DELETE</strong> in the box below.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input 
                                placeholder="Type DELETE to confirm" 
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={deleteInput !== "DELETE" || isSubmitting}
                                    onClick={handleDeleteMess}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    I understand, delete this mess
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </>
      ) : (
        !loading && messData && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Mess Settings</CardTitle>
                    <CardDescription>These settings are only available to the mess manager.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view or edit Mess settings. Please contact your mess manager for assistance.</p>
                </CardContent>
            </Card>
        )
      )}
    </div>
  );
}
