
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
import { addExpense } from '@/services/messService';
import { ReceiptUpload } from './receipt-upload';

interface AddExpenseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messId: string;
  userId: string;
  onSuccess: () => void;
}

export function AddExpenseDialog({ isOpen, setIsOpen, messId, userId, onSuccess }: AddExpenseDialogProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const [receiptUploadKey, setReceiptUploadKey] = useState(Date.now());

  const handleClearForm = () => {
    setAmount('');
    setDescription('');
    setReceiptUrl(null);
    setReceiptUploadKey(Date.now()); // This will force ReceiptUpload to remount and reset
  }

  const handleSubmit = async () => {
    if (!description.trim() || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid description and positive amount.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await addExpense(messId, userId, parseFloat(amount), description.trim(), receiptUrl);
      toast({
        title: "Success!",
        description: "Your expense has been submitted for manager approval.",
      });
      onSuccess();
      setIsOpen(false);
      handleClearForm();
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({
        title: "Error",
        description: "Could not submit your expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClearForm();
      setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Mess Expense</DialogTitle>
          <DialogDescription>
            Enter details of an expense you paid for. This will be sent to the manager for approval.
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
           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="receipt" className="text-right pt-2">
              Receipt
            </Label>
            <div className="col-span-3">
              <ReceiptUpload 
                key={receiptUploadKey}
                onUploadComplete={setReceiptUrl} 
                userId={userId} 
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
