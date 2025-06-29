
"use client";

import { useState, useEffect } from 'react';
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
import { getMessById, getUserProfile, updateMealSettings, type UserProfile as AppUserProfile, type MealSettings } from '@/services/messService';

const members = [
  { id: 2, name: "Karim Khan", role: "member", avatar: "https://placehold.co/40x40.png" },
  { id: 3, name: "Jabbar Ali", role: "member", avatar: "https://placehold.co/40x40.png" },
  { id: 4, name: "Salam Sheikh", role: "member", avatar: "https://placehold.co/40x40.png" },
  { id: 5, name: "Farah Ahmed", role: "member", avatar: "https://placehold.co/40x40.png" },
];

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
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [mealSettings, setMealSettings] = useState<MealSettings>({
        breakfastCutoff: "02:00",
        lunchCutoff: "13:00",
        dinnerCutoff: "20:00",
        isBreakfastOn: true,
        isLunchOn: true,
        isDinnerOn: true,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                getUserProfile(user.uid).then(profile => {
                    setUserProfile(profile);
                    if (profile?.messId) {
                        getMessById(profile.messId).then(mess => {
                            if (mess) {
                               setMessData(mess as MessData);
                               if (mess.mealSettings) {
                                   setMealSettings(mess.mealSettings);
                               }
                            }
                            setLoading(false);
                        });
                    } else {
                        setLoading(false);
                    }
                });
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
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
                <CardTitle className="font-headline">MessX Information</CardTitle>
                <CardDescription>Update your mess's general details and invite codes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="mess-name">MessX Name</Label>
                    <Input id="mess-name" defaultValue={messData?.name || ''} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invite-code">MessX Invite Code</Label>
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
                                                <AvatarFallback>{member.name.substring(0,2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{member.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="mr-2">
                                                <UserCog className="mr-2 h-4 w-4"/> Make Manager
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle className="font-headline flex items-center"><ShieldAlert className="mr-2 text-yellow-500" />Transfer Manager Role?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                You are about to make <strong>{member.name}</strong> the new manager of MessX Paradise. You will immediately lose all manager privileges and become a regular member. This action cannot be undone.
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
                                            <AlertDialogCancel onClick={() => setTransferInput("")}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction disabled={transferInput !== "TRANSFER"}>
                                                Confirm Transfer
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                        </AlertDialog>
                                        <Button variant="destructive" size="sm">
                                            <UserMinus className="mr-2 h-4 w-4"/> Remove
                                        </Button>
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
                        <p className="font-medium">Delete this MessX</p>
                        <p className="text-sm text-muted-foreground">Once you delete a MessX, there is no going back. Please be certain.</p>
                    </div>
                    <Button variant="destructive">Delete MessX</Button>
                </CardContent>
            </Card>
        </>
      ) : (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Settings</CardTitle>
                <CardDescription>Personal and MessX settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>You do not have permission to view or edit MessX settings. Please contact your mess manager for assistance.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
