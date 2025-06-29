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
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logGuestMeal } from '@/services/messService';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';


interface LogGuestMealDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messId: string;
  userId: string;
  onSuccess: () => void;
}

export function LogGuestMealDialog({ isOpen, setIsOpen, messId, userId, onSuccess }: LogGuestMealDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [meals, setMeals] = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const resetState = () => {
    setDate(new Date());
    setMeals({ breakfast: 0, lunch: 0, dinner: 0 });
  }

  // This effect ensures the date is reset to the current date each time the dialog is opened.
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const handleMealChange = (mealType: keyof typeof meals, value: string) => {
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

    const totalMeals = meals.breakfast + meals.lunch + meals.dinner;
    if (totalMeals <= 0) {
        toast({ title: "No Meals Entered", description: "Please enter at least one guest meal.", variant: "destructive" });
        return;
    }
    
    setSubmitting(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      await logGuestMeal(messId, userId, dateStr, meals);
      toast({
        title: "Success!",
        description: `Guest meals have been logged and added to your account.`,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to log guest meals:", error);
      toast({
        title: "Error",
        description: "Could not log guest meals. Please try again.",
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
          <DialogTitle className="font-headline">Log Guest Meals</DialogTitle>
          <DialogDescription>
            Add meals for your guests. The cost will be added to your personal account.
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
          <Button type="submit" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Meals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
