
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Loader2, ArrowRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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

  const handleAction = async (item: Deposit | Expense, action: 'approve' | 'reject', type: 'expense' | 'deposit') => {
    if (!userProfile?.messId) return;

    setSubmitting(prev => ({ ...prev, [item.id]: true }));
    
    try {
        if (type === 'expense') {
            const expense = item as Expense;
            if (action === 'approve') {
                await approveExpense(userProfile.messId, expense);
                setPendingExpenses(prev => prev.filter(i => i.id !== expense.id));
            } else {
                await rejectExpense(userProfile.messId, expense.id);
                setPendingExpenses(prev => prev.filter(i => i.id !== expense.id));
            }
        } else { // deposit
            const deposit = item as Deposit;
            if (action === 'approve') {
                await approveDeposit(userProfile.messId, deposit);
                setPendingDeposits(prev => prev.filter(i => i.id !== deposit.id));
            } else {
                await rejectDeposit(userProfile.messId, deposit.id);
                setPendingDeposits(prev => prev.filter(i => i.id !== deposit.id));
            }
        }
        toast({ title: "Success", description: `The request has been ${action}d.` });
    } catch (error) {
        console.error(`Failed to ${action} ${type}`, error);
        toast({ title: "Error", description: `Could not process the request. Please try again.`, variant: "destructive" });
    } finally {
        setSubmitting(prev => ({ ...prev, [item.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderDepositRequest = (item: Deposit) => {
    const type = item.type || 'new';
    
    return (
      <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
                <Badge variant={type === 'delete' ? 'destructive' : 'secondary'}>{type.toUpperCase()}</Badge>
                <p className="font-medium text-muted-foreground">Deposit Request</p>
            </div>
            {type === 'new' && <p className="font-bold text-xl">৳{item.amount.toFixed(2)}</p>}
            {type === 'edit' && 
                <div className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-muted-foreground line-through">৳{item.originalAmount?.toFixed(2)}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>৳{item.amount.toFixed(2)}</span>
                </div>
            }
            {type === 'delete' && <p className="font-bold text-xl text-destructive line-through">৳{item.amount.toFixed(2)}</p>}
            <p className="text-sm text-muted-foreground">Submitted by {item.memberName} on {format(new Date(item.date), "PPP")}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="icon" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleAction(item, 'reject', 'deposit')} disabled={submitting[item.id]}>
                {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                <span className="sr-only">Reject</span>
            </Button>
            <Button variant="outline" size="icon" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleAction(item, 'approve', 'deposit')} disabled={submitting[item.id]}>
                {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                <span className="sr-only">Approve</span>
            </Button>
        </div>
      </div>
    )
  }

  const renderExpenseRequest = (item: Expense) => {
    const type = item.type || 'new';

    return (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
                 <div className="flex items-center gap-2">
                    <Badge variant={type === 'delete' ? 'destructive' : 'secondary'}>{type.toUpperCase()}</Badge>
                    <p className="font-medium text-muted-foreground">Expense Request</p>
                </div>

                {type === 'new' && (
                    <>
                        <p className="font-bold text-xl">৳{item.amount.toFixed(2)}</p>
                        <p className="font-medium">{item.description}</p>
                    </>
                )}
                {type === 'edit' && (
                    <>
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <span className="text-muted-foreground line-through">৳{item.originalData?.amount.toFixed(2)}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span>৳{item.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground line-through">{item.originalData?.description}</span>
                            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="font-medium">{item.description}</span>
                        </div>
                    </>
                )}
                {type === 'delete' && (
                    <>
                        <p className="font-bold text-xl text-destructive line-through">৳{item.amount.toFixed(2)}</p>
                        <p className="font-medium text-destructive line-through">{item.description}</p>
                    </>
                )}
                <p className="text-sm text-muted-foreground">Submitted by {item.addedBy} on {format(new Date(item.date), "PPP")}</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleAction(item, 'reject', 'expense')} disabled={submitting[item.id]}>
                    {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                    <span className="sr-only">Reject</span>
                </Button>
                <Button variant="outline" size="icon" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleAction(item, 'approve', 'expense')} disabled={submitting[item.id]}>
                    {submitting[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                    <span className="sr-only">Approve</span>
                </Button>
            </div>
        </div>
    )
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
              <CardTitle className="font-headline">Pending Expense Requests</CardTitle>
              <CardDescription>Review new submissions, edits, and deletions for expenses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingExpenses.length > 0 
                ? pendingExpenses.map(renderExpenseRequest) 
                : <p className="text-muted-foreground text-center py-8">No pending expenses to review.</p>
              }
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Pending Deposit Requests</CardTitle>
              <CardDescription>Review new submissions, edits, and deletions for deposits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingDeposits.length > 0 
                ? pendingDeposits.map(renderDepositRequest) 
                : <p className="text-muted-foreground text-center py-8">No pending deposits to review.</p>
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
