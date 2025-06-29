
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  getUserProfile,
  getDeposits, 
  getExpenses, 
  deleteDeposit,
  deleteExpense,
  requestDepositDelete,
  requestExpenseDelete,
  type Deposit, 
  type Expense, 
  type UserProfile 
} from "@/services/messService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditDepositDialog } from "../members/edit-deposit-dialog";
import { EditExpenseDialog } from "../members/edit-expense-dialog";

type DeletionTarget = 
  | { type: 'deposit', data: Deposit }
  | { type: 'expense', data: Expense }
  | null;

export default function TransactionsPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDepositOpen, setIsEditDepositOpen] = useState(false);
    const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
    const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [deletionTarget, setDeletionTarget] = useState<DeletionTarget>(null);

    const router = useRouter();
    const { toast } = useToast();

    const fetchData = useCallback((messId: string) => {
        setLoading(true);
        Promise.all([
            getDeposits(messId),
            getExpenses(messId),
        ])
        .then(([depositsData, expensesData]) => {
            setDeposits(depositsData);
            setExpenses(expensesData);
        })
        .catch(error => {
            console.error("Failed to fetch transaction history:", error);
            toast({
            title: "Error",
            description: "Could not load transaction history.",
            variant: "destructive",
            });
        })
        .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                getUserProfile(currentUser.uid).then(profile => {
                    setUserProfile(profile);
                    if (profile?.messId) {
                        fetchData(profile.messId);
                    } else {
                        toast({ title: "No Mess Found", description: "You need to be in a mess to view this page.", variant: "destructive" });
                        router.push('/welcome');
                    }
                })
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router, toast, fetchData]);


    const handleSuccess = () => {
        if (userProfile?.messId) {
            fetchData(userProfile.messId);
        }
    }

    const handleEditDeposit = (deposit: Deposit) => {
        setSelectedDeposit(deposit);
        setIsEditDepositOpen(true);
    };

    const handleEditExpense = (expense: Expense) => {
        setSelectedExpense(expense);
        setIsEditExpenseOpen(true);
    };

    const handleDeleteClick = (target: DeletionTarget) => {
        setDeletionTarget(target);
    }

    const confirmDelete = async () => {
        if (!deletionTarget || !userProfile?.messId) return;
        const { type, data } = deletionTarget;
        const isManager = userProfile.role === 'manager';
        const isOwner = userProfile.uid === data.userId;

        setIsDeleting(true);
        try {
            if (isManager) {
                if (type === 'deposit') {
                    await deleteDeposit(userProfile.messId, data);
                    toast({ title: "Success", description: "Deposit has been deleted." });
                } else if (type === 'expense') {
                    await deleteExpense(userProfile.messId, data.id);
                    toast({ title: "Success", description: "Expense has been deleted." });
                }
            } else if (isOwner) {
                if (type === 'deposit') {
                    await requestDepositDelete(userProfile.messId, data);
                    toast({ title: "Request Sent", description: "Your request to delete the deposit has been sent for approval." });
                } else if (type === 'expense') {
                    await requestExpenseDelete(userProfile.messId, data as Expense);
                    toast({ title: "Request Sent", description: "Your request to delete the expense has been sent for approval." });
                }
            }
            handleSuccess();
        } catch (error) {
            console.error("Failed to process delete request:", error);
            toast({ title: "Error", description: "Could not process the delete request.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setDeletionTarget(null);
        }
    };

    const TransactionList = ({ data, type }: { data: (Deposit[] | Expense[]), type: 'deposit' | 'expense' }) => (
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                {type === 'expense' && <TableHead>Description</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? data.map(item => {
                const isOwner = userProfile?.uid === item.userId;
                const canTakeAction = userProfile?.role === 'manager' || isOwner;

                return (
                    <TableRow key={item.id}>
                    <TableCell>{type === 'deposit' ? (item as Deposit).memberName : (item as Expense).addedBy}</TableCell>
                    {type === 'expense' && <TableCell>{(item as Expense).description}</TableCell>}
                    <TableCell>{format(new Date(item.date), 'PP')}</TableCell>
                    <TableCell className={`text-right font-mono ${type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                        {type === 'deposit' ? '+' : '-'} ৳{item.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                        {canTakeAction ? (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => type === 'deposit' ? handleEditDeposit(item as Deposit) : handleEditExpense(item as Expense)}>
                                <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick({ type, data: item as any })}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                    </TableCell>
                    </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={type === 'expense' ? 5 : 4} className="h-24 text-center">
                    No {type}s found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      );
    
    if (loading || !userProfile) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
        <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deposits">All Deposits ({deposits.length})</TabsTrigger>
                <TabsTrigger value="expenses">All Expenses ({expenses.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="deposits">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Approved Deposits</CardTitle>
                        <CardDescription>All approved deposits from all members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TransactionList data={deposits} type="deposit" />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="expenses">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Approved Expenses</CardTitle>
                        <CardDescription>All approved expenses submitted by all members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TransactionList data={expenses} type="expense" />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {selectedDeposit && userProfile?.messId && (
            <EditDepositDialog 
                isOpen={isEditDepositOpen}
                setIsOpen={setIsEditDepositOpen}
                deposit={selectedDeposit}
                messId={userProfile.messId}
                onSuccess={handleSuccess}
                isMemberRequest={userProfile.role !== 'manager' && userProfile.uid === selectedDeposit.userId}
            />
        )}
        {selectedExpense && userProfile?.messId && (
            <EditExpenseDialog 
                isOpen={isEditExpenseOpen}
                setIsOpen={setIsEditExpenseOpen}
                expense={selectedExpense}
                messId={userProfile.messId}
                onSuccess={handleSuccess}
                isMemberRequest={userProfile.role !== 'manager' && userProfile.uid === selectedExpense.userId}
            />
        )}

        {deletionTarget && userProfile && (
            <AlertDialog open={!!deletionTarget} onOpenChange={(open) => !open && setDeletionTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        {userProfile.role === 'manager'
                            ? `This action cannot be undone. This will permanently delete the ${deletionTarget?.type} of ৳${deletionTarget?.data.amount.toFixed(2)} and adjust balances if it's a deposit.`
                            : `This will send a request to the manager to delete this ${deletionTarget?.type}. You will be notified when it's approved or rejected.`
                        }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {userProfile.role === 'manager' ? 'Confirm Delete' : 'Send Request'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </>
    );
}
