
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { getMealLedgerForUser, type MealLedgerEntry } from '@/services/messService';
import { format, parseISO } from 'date-fns';

interface MealLedgerDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messId: string;
  memberId: string;
  memberName: string;
}

export function MealLedgerDialog({ isOpen, setIsOpen, messId, memberId, memberName }: MealLedgerDialogProps) {
  const [ledger, setLedger] = useState<MealLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && messId && memberId) {
      setLoading(true);
      getMealLedgerForUser(messId, memberId, 30) // Fetch last 30 days
        .then(setLedger)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, messId, memberId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Meal Ledger for {memberName}</DialogTitle>
          <DialogDescription>
            Showing meal history for the last 30 days.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loading ? (
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
                                <TableCell className="font-medium">{format(parseISO(entry.date), 'EEE, MMM d')}</TableCell>
                                <TableCell className="text-center font-mono">{entry.breakfast}</TableCell>
                                <TableCell className="text-center font-mono">{entry.lunch}</TableCell>
                                <TableCell className="text-center font-mono">{entry.dinner}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No meal records found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
