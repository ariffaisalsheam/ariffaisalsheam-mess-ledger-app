
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateExpense, type Expense } from '@/services/messService';

interface EditExpenseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  expense: Expense;
  messId: string;
  onSuccess: () => void;
}

export function EditExpenseDialog({ isOpen, setIsOpen, expense, messId, onSuccess }: EditExpenseDialogProps) {
  const [amount, setAmount] = useState(expense.amount.toString());
  const [description, setDescription] = useState(expense.description);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const newAmount = parseFloat(amount);
    if (!description.trim() || !amount || isNaN(newAmount) || newAmount <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid description and positive amount.",
        variant: "destructive",
      });
      return;
    }

    if (newAmount === expense.amount && description.trim() === expense.description) {
        setIsOpen(false);
        return;
    }

    setSubmitting(true);
    try {
      await updateExpense(messId, expense.id, newAmount, description.trim());
      toast({
        title: "Success!",
        description: "The expense has been updated.",
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({
        title: "Error",
        description: "Could not update the expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Expense</DialogTitle>
          <DialogDescription>
            Update the expense details submitted by {expense.addedBy}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Weekly groceries"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount (৳)
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 1250.50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
