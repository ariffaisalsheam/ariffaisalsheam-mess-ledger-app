
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    getUserProfile, 
    getMembersOfMess, 
    getMealLedgerForUser,
    updateMealForDate,
    getMessById,
    type UserProfile,
    type Member,
    type MealLedgerEntry,
    type MealStatus,
    type MealSettings
} from '@/services/messService';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { AddMealRecordDialog } from '../members/add-meal-record-dialog';

const MealCell = ({ personal, guest }: { personal?: number; guest?: number }) => {
    const pVal = personal ?? 0;
    const gVal = guest ?? 0;
    
    const formatNum = (num: number) => num.toFixed(1).replace(/\.0$/, '');

    return (
        <>
            {formatNum(pVal)}
            {gVal > 0 && (
                <span className="text-muted-foreground"> ({formatNum(gVal)})</span>
            )}
        </>
    );
};

export default function LedgerPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [ledger, setLedger] = useState<MealLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<MealLedgerEntry | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setLoading(true);
                getUserProfile(currentUser.uid).then(profile => {
                    setUserProfile(profile);
                    if (profile?.messId) {
                        getMessById(profile.messId).then(mess => setMealSettings(mess?.mealSettings ?? null));
                        getMembersOfMess(profile.messId)
                            .then(setMembers)
                            .catch(err => {
                                console.error("Failed to load members", err);
                                toast({ title: "Error", description: "Could not load members.", variant: "destructive" });
                            });
                    } else {
                        toast({ title: "No Mess Found", description: "You need to be in a mess to view this page.", variant: "destructive" });
                        router.push('/welcome');
                    }
                }).finally(() => setLoading(false));
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router, toast]);
    
    const fetchLedgerData = useCallback(() => {
        if (selectedMemberId && userProfile?.messId) {
            setLoadingLedger(true);
            setLedger([]);
            getMealLedgerForUser(userProfile.messId, selectedMemberId, 30)
                .then(setLedger)
                .catch(err => {
                    console.error("Failed to fetch meal ledger", err);
                    toast({ title: "Error", description: "Could not load the meal ledger for the selected member.", variant: "destructive" });
                })
                .finally(() => setLoadingLedger(false));
        }
    }, [selectedMemberId, userProfile?.messId, toast]);

    useEffect(() => {
        fetchLedgerData();
    }, [fetchLedgerData]);
    
    const handleEdit = (entry: MealLedgerEntry) => {
        setSelectedEntry(entry);
        setIsEditDialogOpen(true);
    };

    const handleDelete = (entry: MealLedgerEntry) => {
        setSelectedEntry(entry);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedEntry || !userProfile?.messId || !selectedMemberId) return;
        setIsSubmitting(true);
        try {
            const clearedMeals: Partial<MealStatus> = {
                breakfast: 0, lunch: 0, dinner: 0,
                guestBreakfast: 0, guestLunch: 0, guestDinner: 0,
                isSetByUser: true 
            };
            await updateMealForDate(userProfile.messId, selectedMemberId, selectedEntry.date, clearedMeals);
            toast({ title: 'Success', description: 'Meal record has been cleared.' });
            fetchLedgerData();
        } catch (error) {
            console.error("Failed to delete record:", error);
            toast({ title: 'Error', description: 'Could not clear the record.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setIsDeleteDialogOpen(false);
            setSelectedEntry(null);
        }
    };

    const selectedMemberName = members.find(m => m.id === selectedMemberId)?.name || '';
    const isManager = userProfile?.role === 'manager';
    const activeMealCount = (mealSettings?.isBreakfastOn ? 1:0) + (mealSettings?.isLunchOn ? 1:0) + (mealSettings?.isDinnerOn ? 1:0);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Meal Ledger</CardTitle>
                    <CardDescription>Select a member to view their meal history for the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 max-w-sm">
                        <label htmlFor="member-select" className="text-sm font-medium">Select Member</label>
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                            <SelectTrigger id="member-select">
                                <SelectValue placeholder="Select a member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {members.map(member => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedMemberId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Showing Ledger for {selectedMemberName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingLedger ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <ScrollArea className="h-[60vh]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            {mealSettings?.isBreakfastOn && <TableHead className="text-center">Breakfast (Guest)</TableHead>}
                                            {mealSettings?.isLunchOn && <TableHead className="text-center">Lunch (Guest)</TableHead>}
                                            {mealSettings?.isDinnerOn && <TableHead className="text-center">Dinner (Guest)</TableHead>}
                                            <TableHead className="text-center">Total</TableHead>
                                            {isManager && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.length > 0 ? ledger.map((entry) => {
                                            const totalMeals = (entry.breakfast || 0) + (entry.lunch || 0) + (entry.dinner || 0) + (entry.guestBreakfast || 0) + (entry.guestLunch || 0) + (entry.guestDinner || 0);
                                            return (
                                                <TableRow key={entry.date}>
                                                    <TableCell className="font-medium">{format(parseISO(entry.date), 'EEEE, MMM d')}</TableCell>
                                                    {mealSettings?.isBreakfastOn && <TableCell className="text-center font-mono"><MealCell personal={entry.breakfast} guest={entry.guestBreakfast} /></TableCell>}
                                                    {mealSettings?.isLunchOn && <TableCell className="text-center font-mono"><MealCell personal={entry.lunch} guest={entry.guestLunch} /></TableCell>}
                                                    {mealSettings?.isDinnerOn && <TableCell className="text-center font-mono"><MealCell personal={entry.dinner} guest={entry.guestDinner} /></TableCell>}
                                                    <TableCell className="text-center font-bold font-mono">{totalMeals.toFixed(1).replace(/\.0$/, '')}</TableCell>
                                                     {isManager && (
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} disabled={isSubmitting}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(entry)} className="text-destructive hover:text-destructive" disabled={isSubmitting}>
                                                                {isSubmitting && selectedEntry?.date === entry.date ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={2 + activeMealCount + (isManager ? 1 : 0)} className="text-center text-muted-foreground h-24">No meal records found for this member in the last 30 days.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}

            {isManager && userProfile?.messId && selectedMemberId && selectedMemberName && selectedEntry && (
                <AddMealRecordDialog
                    isOpen={isEditDialogOpen}
                    setIsOpen={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) setSelectedEntry(null);
                    }}
                    messId={userProfile.messId}
                    memberId={selectedMemberId}
                    memberName={selectedMemberName}
                    initialDate={selectedEntry.date}
                    mealSettings={mealSettings}
                    onSuccess={fetchLedgerData}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will clear the entire meal record (personal and guest) for <strong>{selectedMemberName}</strong> on {selectedEntry?.date ? format(parseISO(selectedEntry.date), 'PPP') : ''}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedEntry(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
