
"use client";

import { useState, useEffect } from 'react';
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateMealForDate, getMealStatusForDate, type MealStatus } from '@/services/messService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddMealRecordDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messId: string;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

export function AddMealRecordDialog({ isOpen, setIsOpen, messId, memberId, memberName, onSuccess }: AddMealRecordDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [meals, setMeals] = useState<MealStatus>({ breakfast: 0, lunch: 0, dinner: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && date && memberId) {
      setLoadingDate(true);
      const dateStr = format(date, "yyyy-MM-dd");
      
      getMealStatusForDate(messId, memberId, dateStr)
        .then(setMeals)
        .catch(console.error)
        .finally(() => setLoadingDate(false));
    } else if (!isOpen) {
      // Reset state when dialog closes
      setDate(new Date());
      setMeals({ breakfast: 0, lunch: 0, dinner: 0 });
    }
  }, [isOpen, date, memberId, messId]);

  const handleMealChange = (mealType: keyof MealStatus, value: string) => {
    const count = parseFloat(value);
    if (!isNaN(count) && count >= 0) {
      setMeals(prev => ({ ...prev, [mealType]: count }));
    } else if (value === "") {
        setMeals(prev => ({...prev, [mealType]: 0}));
    }
  }

  const handleSubmit = async () => {
    if (!date) {
        toast({ title: "No Date Selected", description: "Please select a date.", variant: "destructive" });
        return;
    }
    
    setSubmitting(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      await updateMealForDate(messId, memberId, dateStr, meals);
      toast({
        title: "Success!",
        description: `Meal record for ${memberName} on ${format(date, 'PPP')} has been updated.`,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to add/update meal record:", error);
      toast({
        title: "Error",
        description: "Could not save the meal record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Add/Edit Meal Record</DialogTitle>
          <DialogDescription>
            Manually set meal counts for {memberName} on a specific date.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meal-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="breakfast" className="text-center">Breakfast</Label>
                <Input id="breakfast" type="number" step="0.5" min="0" value={meals.breakfast} onChange={e => handleMealChange('breakfast', e.target.value)} className="text-center" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lunch" className="text-center">Lunch</Label>
                <Input id="lunch" type="number" step="0.5" min="0" value={meals.lunch} onChange={e => handleMealChange('lunch', e.target.value)} className="text-center" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dinner" className="text-center">Dinner</Label>
                <Input id="dinner" type="number" step="0.5" min="0" value={meals.dinner} onChange={e => handleMealChange('dinner', e.target.value)} className="text-center" />
              </div>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={submitting || loadingDate}>
            {(submitting || loadingDate) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
