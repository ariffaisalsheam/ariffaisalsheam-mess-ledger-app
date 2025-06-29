
"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { 
  getDepositsForUser, 
  getExpensesForUser, 
  deleteDeposit,
  deleteExpense,
  type Deposit, 
  type Expense, 
  type Member, 
  type UserProfile 
} from "@/services/messService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditDepositDialog } from "./edit-deposit-dialog";
import { EditExpenseDialog } from "./edit-expense-dialog";

interface TransactionHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  member: Member;
  messId: string;
  currentUserProfile: UserProfile;
  onSuccess: () => void;
}

type DeletionTarget = 
  | { type: 'deposit', data: Deposit }
  | { type: 'expense', data: Expense }
  | null;

export function TransactionHistoryDialog({ isOpen, setIsOpen, member, messId, currentUserProfile, onSuccess }: TransactionHistoryDialogProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDepositOpen, setIsEditDepositOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget>(null);
  const { toast } = useToast();

  const isManager = currentUserProfile.role === 'manager';

  const fetchData = useCallback(() => {
    if (isOpen && member) {
      setLoading(true);
      Promise.all([
        getDepositsForUser(messId, member.id),
        getExpensesForUser(messId, member.id),
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
    }
  }, [isOpen, messId, member, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (!deletionTarget) return;

    setIsDeleting(true);
    try {
      if (deletionTarget.type === 'deposit') {
        await deleteDeposit(messId, deletionTarget.data.id, deletionTarget.data.userId, deletionTarget.data.amount);
        toast({ title: "Success", description: "Deposit has been deleted." });
      } else if (deletionTarget.type === 'expense') {
        await deleteExpense(messId, deletionTarget.data.id);
        toast({ title: "Success", description: "Expense has been deleted." });
      }
      onSuccess();
      fetchData(); // Refetch data within the dialog
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast({ title: "Error", description: "Could not delete the transaction.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeletionTarget(null);
    }
  };

  const TransactionList = ({ data, type }: { data: (Deposit[] | Expense[]), type: 'deposit' | 'expense' }) => (
    <ScrollArea className="h-72">
      <Table>
        <TableHeader>
          <TableRow>
            {type === 'expense' && <TableHead>Description</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {isManager && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? data.map(item => (
            <TableRow key={item.id}>
              {type === 'expense' && <TableCell>{(item as Expense).description}</TableCell>}
              <TableCell>{format(new Date(item.date), 'PP')}</TableCell>
              <TableCell className={`text-right font-mono ${type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                {type === 'deposit' ? '+' : '-'} ৳{item.amount.toFixed(2)}
              </TableCell>
              {isManager && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => type === 'deposit' ? handleEditDeposit(item as Deposit) : handleEditExpense(item as Expense)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick({ type, data: item as any })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={isManager ? 4 : 3} className="h-24 text-center">
                No {type}s found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Transaction History for {member.name}</DialogTitle>
            <DialogDescription>
              View and manage approved deposits and expenses for this member.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="deposits" className="py-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deposits">Deposits ({deposits.length})</TabsTrigger>
                <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="deposits" className="mt-4">
                <TransactionList data={deposits} type="deposit" />
              </TabsContent>
              <TabsContent value="expenses" className="mt-4">
                <TransactionList data={expenses} type="expense" />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialogs */}
      {selectedDeposit && (
        <EditDepositDialog 
            isOpen={isEditDepositOpen}
            setIsOpen={setIsEditDepositOpen}
            deposit={selectedDeposit}
            messId={messId}
            onSuccess={() => {
                fetchData();
                onSuccess();
            }}
        />
      )}
       {selectedExpense && (
        <EditExpenseDialog 
            isOpen={isEditExpenseOpen}
            setIsOpen={setIsEditExpenseOpen}
            expense={selectedExpense}
            messId={messId}
            onSuccess={() => {
                fetchData();
                onSuccess();
            }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletionTarget} onOpenChange={(open) => !open && setDeletionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deletionTarget?.type} of 
              <strong> ৳{deletionTarget?.data.amount.toFixed(2)}</strong>
              {deletionTarget?.type === 'deposit' && ` and adjust ${member.name}'s balance accordingly.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
