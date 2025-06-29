
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { Copy, Share2, UserCog, UserMinus, ShieldAlert, Loader2, Save } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    removeMemberFromMess,
    type UserProfile as AppUserProfile, 
    type MealSettings,
    type Member
} from '@/services/messService';


interface MessData {
    id: string;
    name: string;
    inviteCode?: string;
    mealSettings?: MealSettings;
}

export default function SettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [transferInput, setTransferInput] = useState("");
    const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
    const [messData, setMessData] = useState<MessData | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mealSettings, setMealSettings] = useState<MealSettings>({
        breakfastCutoff: "02:00",
        lunchCutoff: "13:00",
        dinnerCutoff: "20:00",
        isBreakfastOn: true,
        isLunchOn: true,
        isDinnerOn: true,
    });

    const fetchData = useCallback(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        setLoading(true);
        getUserProfile(currentUser.uid).then(profile => {
            setUserProfile(profile);
            if (profile?.messId && profile.role === 'manager') {
                Promise.all([
                    getMessById(profile.messId),
                    getMembersOfMess(profile.messId)
                ]).then(([mess, fetchedMembers]) => {
                    if (mess) {
                        setMessData(mess as MessData);
                        if (mess.mealSettings) {
                            setMealSettings(prev => ({...prev, ...mess.mealSettings}));
                        }
                    }
                    setMembers(fetchedMembers.filter(m => m.id !== currentUser.uid));
                }).catch(err => {
                    console.error("Failed to load settings data", err);
                    toast({ title: "Error", description: "Could not load settings data.", variant: "destructive" });
                }).finally(() => {
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });
    }, [toast]);

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
            // Redirect to dashboard as user is no longer a manager
            router.push('/dashboard');
        } catch(error: any) {
            toast({ title: "Error", description: error.message || "Failed to transfer role.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setTransferInput("");
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!messData?.id) return;
        setIsSubmitting(true);
        try {
            await removeMemberFromMess(messData.id, memberId);
            toast({ title: "Success!", description: `${memberName} has been removed from the mess.` });
            fetchData(); // Refresh list
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to remove member.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
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
      {isManager ? (
        <>
            <Card>
                <CardHeader>
                <CardTitle className="font-headline">Mess Information</CardTitle>
                <CardDescription>Update your mess's general details and invite codes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="mess-name">Mess Name</Label>
                    <Input id="mess-name" defaultValue={messData?.name || ''} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invite-code">Mess Invite Code</Label>
                    <div className="flex gap-2">
                        <Input id="invite-code" readOnly value={messData?.inviteCode || 'N/A'} />
                        <Button variant="outline" size="icon" onClick={handleCopy} disabled={!messData?.inviteCode}><Copy className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
                    </div>
                </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Meal Settings</CardTitle>
                    <CardDescription>Enable or disable meals, and set cut-off times. Members can only toggle meals that are ON.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
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
                        <Input id="breakfastCutoff" type="time" value={mealSettings.breakfastCutoff} onChange={handleSettingsChange} disabled={!mealSettings.isBreakfastOn} />
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
                        <Input id="lunchCutoff" type="time" value={mealSettings.lunchCutoff} onChange={handleSettingsChange} disabled={!mealSettings.isLunchOn} />
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
                        <Input id="dinnerCutoff" type="time" value={mealSettings.dinnerCutoff} onChange={handleSettingsChange} disabled={!mealSettings.isDinnerOn} />
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
                <CardTitle className="font-headline">Member Management</CardTitle>
                <CardDescription>Transfer manager role or remove members from the mess.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person portrait"/>
                                                <AvatarFallback>{member.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{member.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
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
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" disabled={isSubmitting}>
                                                    <UserMinus className="mr-2 h-4 w-4"/> Remove
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-headline">Remove {member.name}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove <strong>{member.name}</strong> from the mess? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => handleRemoveMember(member.id, member.name)}
                                                        disabled={isSubmitting}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Confirm Removal
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                    <Button variant="destructive">Delete Mess</Button>
                </CardContent>
            </Card>
        </>
      ) : (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Settings</CardTitle>
                <CardDescription>Personal and Mess settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>You do not have permission to view or edit Mess settings. Please contact your mess manager for assistance.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
