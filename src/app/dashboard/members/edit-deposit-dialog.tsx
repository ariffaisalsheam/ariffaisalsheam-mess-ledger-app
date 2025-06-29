
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateDeposit, type Deposit } from '@/services/messService';

interface EditDepositDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  deposit: Deposit;
  messId: string;
  onSuccess: () => void;
}

export function EditDepositDialog({ isOpen, setIsOpen, deposit, messId, onSuccess }: EditDepositDialogProps) {
  const [amount, setAmount] = useState(deposit.amount.toString());
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const newAmount = parseFloat(amount);
    if (!amount || isNaN(newAmount) || newAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive number for the deposit amount.",
        variant: "destructive",
      });
      return;
    }

    if(newAmount === deposit.amount) {
        setIsOpen(false);
        return;
    }

    setSubmitting(true);
    try {
      await updateDeposit(messId, deposit.id, deposit.userId, deposit.amount, newAmount);
      toast({
        title: "Success!",
        description: "The deposit has been updated.",
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update deposit:", error);
      toast({
        title: "Error",
        description: "Could not update the deposit. Please try again.",
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
          <DialogTitle className="font-headline">Edit Deposit</DialogTitle>
          <DialogDescription>
            Update the deposit amount for {deposit.memberName}. The member's balance will be adjusted automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
              placeholder="e.g., 2000"
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
