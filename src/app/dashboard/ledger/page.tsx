
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    getUserProfile, 
    getMembersOfMess, 
    getMealLedgerForUser,
    type UserProfile,
    type Member,
    type MealLedgerEntry
} from '@/services/messService';
import { format, parseISO } from 'date-fns';

export default function LedgerPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [ledger, setLedger] = useState<MealLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLedger, setLoadingLedger] = useState(false);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setLoading(true);
                getUserProfile(currentUser.uid).then(profile => {
                    setUserProfile(profile);
                    if (profile?.messId) {
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
    
    useEffect(() => {
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

    const selectedMemberName = members.find(m => m.id === selectedMemberId)?.name || '';

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
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-center">Breakfast</TableHead>
                                            <TableHead className="text-center">Lunch</TableHead>
                                            <TableHead className="text-center">Dinner</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.length > 0 ? ledger.map((entry) => (
                                            <TableRow key={entry.date}>
                                                <TableCell className="font-medium">{format(parseISO(entry.date), 'EEEE, MMM d')}</TableCell>
                                                <TableCell className="text-center font-mono">{(entry.breakfast || 0).toFixed(1)}</TableCell>
                                                <TableCell className="text-center font-mono">{(entry.lunch || 0).toFixed(1)}</TableCell>
                                                <TableCell className="text-center font-mono">{(entry.dinner || 0).toFixed(1)}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No meal records found for this member in the last 30 days.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
