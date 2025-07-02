
"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import {
  getUserProfile,
  deleteDeposit,
  deleteExpense,
  requestDepositDelete,
  requestExpenseDelete,
  type Deposit,
  type Expense,
  type UserProfile,
} from "@/services/messService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditDepositDialog } from "../members/edit-deposit-dialog";
import { EditExpenseDialog } from "../members/edit-expense-dialog";
import { useFirestorePagination } from "@/hooks/use-firestore-pagination";
import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

type DeletionTarget =
  | { type: 'deposit', data: Deposit }
  | { type: 'expense', data: Expense }
  | null;

const TransactionListComponent = ({
  data,
  type,
  onEdit,
  onDelete,
  userProfile,
}: {
  data: (Deposit[] | Expense[]);
  type: 'deposit' | 'expense';
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  userProfile: UserProfile;
}) => (
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
        const isOwner = userProfile.uid === item.userId;
        const canTakeAction = userProfile.role === 'manager' || isOwner;

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
                  {type === 'expense' && (item as Expense).receiptUrl && (
                    <Button variant="ghost" size="icon" onClick={() => window.open((item as Expense).receiptUrl!, '_blank')}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
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
);

const MemoizedTransactionList = memo(TransactionListComponent);

export default function TransactionsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDepositOpen, setIsEditDepositOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth!, (currentUser) => {
      if (currentUser) {
        getUserProfile(currentUser.uid).then(profile => {
          setUserProfile(profile);
          if (!profile?.messId) {
            toast({ title: "No Mess Found", description: "You need to be in a mess to view this page.", variant: "destructive" });
            router.push('/welcome');
          }
        })
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  const depositsQuery = useMemo(() => {
    if (!userProfile?.messId || !db) return null;
    return query(collection(db, 'messes', userProfile.messId, 'deposits'), orderBy('date', 'desc'));
  }, [userProfile?.messId]);

  const expensesQuery = useMemo(() => {
    if (!userProfile?.messId || !db) return null;
    return query(collection(db, 'messes', userProfile.messId, 'expenses'), orderBy('date', 'desc'));
  }, [userProfile?.messId]);

  const { docs: deposits, loading: depositsLoading, hasMore: hasMoreDeposits, loadMore: loadMoreDeposits, reload: reloadDeposits } = useFirestorePagination<Deposit>(depositsQuery, 20);
  const { docs: expenses, loading: expensesLoading, hasMore: hasMoreExpenses, loadMore: loadMoreExpenses, reload: reloadExpenses } = useFirestorePagination<Expense>(expensesQuery, 20);

  const handleSuccess = () => {
    reloadDeposits();
    reloadExpenses();
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

  if (!userProfile) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposits">All Deposits</TabsTrigger>
          <TabsTrigger value="expenses">All Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Approved Deposits</CardTitle>
              <CardDescription>All approved deposits from all members.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <MemoizedTransactionList 
                  data={deposits} 
                  type="deposit" 
                  userProfile={userProfile}
                  onEdit={handleEditDeposit}
                  onDelete={(item) => handleDeleteClick({ type: 'deposit', data: item })}
                />
              </ScrollArea>
              {hasMoreDeposits && (
                <div className="text-center mt-4">
                  <Button onClick={loadMoreDeposits} disabled={depositsLoading}>
                    {depositsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load More
                  </Button>
                </div>
              )}
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
              <ScrollArea className="h-[60vh]">
                <MemoizedTransactionList 
                  data={expenses} 
                  type="expense"
                  userProfile={userProfile}
                  onEdit={handleEditExpense}
                  onDelete={(item) => handleDeleteClick({ type: 'expense', data: item })}
                />
              </ScrollArea>
               {hasMoreExpenses && (
                <div className="text-center mt-4">
                  <Button onClick={loadMoreExpenses} disabled={expensesLoading}>
                    {expensesLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load More
                  </Button>
                </div>
              )}
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
