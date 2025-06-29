
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  getUserProfile,
  getPendingDeposits,
  getPendingExpenses,
  approveDeposit,
  rejectDeposit,
  approveExpense,
  rejectExpense,
  type Expense,
  type Deposit,
  type UserProfile,
} from "@/services/messService";
import { format } from 'date-fns';

export default function ReviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(profile => {
        setUserProfile(profile);
        if (profile?.messId && profile.role === 'manager') {
          Promise.all([
            getPendingExpenses(profile.messId),
            getPendingDeposits(profile.messId)
          ]).then(([expenses, deposits]) => {
            setPendingExpenses(expenses);
            setPendingDeposits(deposits);
            setLoading(false);
          });
        } else if (profile) {
            // Not a manager, redirect
            toast({ title: "Unauthorized", description: "You don't have permission to view this page.", variant: "destructive" });
            router.push('/dashboard');
        } else {
            setLoading(false);
        }
      });
    }
  }, [user, router, toast]);

  const handleAction = async (id: string, action: 'approve' | 'reject', type: 'expense' | 'deposit') => {
    if (!userProfile?.messId) return;

    setSubmitting(prev => ({ ...prev, [id]: true }));
    
    try {
        if (type === 'expense') {
            if (action === 'approve') {
                await approveExpense(userProfile.messId, id);
                setPendingExpenses(prev => prev.filter(item => item.id !== id));
            } else {
                await rejectExpense(userProfile.messId, id);
                setPendingExpenses(prev => prev.filter(item => item.id !== id));
            }
        } else { // deposit
            if (action === 'approve') {
                await approveDeposit(userProfile.messId, id);
                setPendingDeposits(prev => prev.filter(item => item.id !== id));
            } else {
                await rejectDeposit(userProfile.messId, id);
                setPendingDeposits(prev => prev.filter(item => item.id !== id));
            }
        }
        toast({ title: "Success", description: `The ${type} has been ${action}d.` });
    } catch (error) {
        console.error(`Failed to ${action} ${type}`, error);
        toast({ title: "Error", description: `Could not ${action} the ${type}. Please try again.`, variant: "destructive" });
    } finally {
        setSubmitting(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses ({pendingExpenses.length})</TabsTrigger>
          <TabsTrigger value="deposits">Deposits ({pendingDeposits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Pending Expenses</CardTitle>
              <CardDescription>Review these expense submissions. Approved items will be added to the main calculations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingExpenses.length > 0 ? pendingExpenses.map(item => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="flex-1">
                    <p className="font-bold text-xl">৳{item.amount.toFixed(2)}</p>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">Submitted by {item.addedBy} on {format(new Date(item.date), "PPP")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleAction(item.id, 'reject', 'expense')} disabled={submitting[item.id]}>
                      {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                      <span className="sr-only">Reject</span>
                    </Button>
                    <Button variant="outline" size="icon" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleAction(item.id, 'approve', 'expense')} disabled={submitting[item.id]}>
                      {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                      <span className="sr-only">Approve</span>
                    </Button>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-center py-8">No pending expenses to review.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Pending Deposits</CardTitle>
              <CardDescription>Review these deposit submissions. Approved amounts will be credited to the member's balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {pendingDeposits.length > 0 ? pendingDeposits.map(item => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="flex-1">
                    <p className="font-bold text-xl">৳{item.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Submitted by {item.memberName} on {format(new Date(item.date), "PPP")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleAction(item.id, 'reject', 'deposit')} disabled={submitting[item.id]}>
                       {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                       <span className="sr-only">Reject</span>
                    </Button>
                    <Button variant="outline" size="icon" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleAction(item.id, 'approve', 'deposit')} disabled={submitting[item.id]}>
                       {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                       <span className="sr-only">Approve</span>
                    </Button>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-center py-8">No pending deposits to review.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
