"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function MealsPage() {
  const [meals, setMeals] = useState({
    breakfast: true,
    lunch: true,
    dinner: false,
  });

  const handleMealToggle = (meal: keyof typeof meals) => {
    setMeals(prev => ({ ...prev, [meal]: !prev[meal] }));
    // In a real app, this would trigger a save to the backend.
  };

  // Mock cut-off times for demonstration
  const now = new Date();
  const breakfastCutoff = new Date(now);
  breakfastCutoff.setHours(2, 0, 0, 0); // 2:00 AM
  const lunchCutoff = new Date(now);
  lunchCutoff.setHours(13, 0, 0, 0); // 1:00 PM
  const dinnerCutoff = new Date(now);
  dinnerCutoff.setHours(20, 0, 0, 0); // 8:00 PM

  const isBreakfastLocked = now > breakfastCutoff;
  const isLunchLocked = now > lunchCutoff;
  const isDinnerLocked = now > dinnerCutoff;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Today's Meals</CardTitle>
          <CardDescription>
            Turn your meals ON or OFF for today. Toggles lock after the cut-off time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`flex items-center justify-between p-4 rounded-lg ${isBreakfastLocked ? 'bg-muted/50' : ''}`}>
            <div>
              <Label htmlFor="breakfast-mode" className="text-lg font-medium">Breakfast</Label>
              <p className="text-sm text-muted-foreground">Cut-off time: 2:00 AM. {isBreakfastLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="breakfast-mode"
              checked={meals.breakfast}
              onCheckedChange={() => handleMealToggle('breakfast')}
              disabled={isBreakfastLocked}
              aria-readonly={isBreakfastLocked}
            />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-4 rounded-lg ${isLunchLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="lunch-mode" className="text-lg font-medium">Lunch</Label>
                <p className="text-sm text-muted-foreground">Cut-off time: 1:00 PM. {isLunchLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="lunch-mode"
              checked={meals.lunch}
              onCheckedChange={() => handleMealToggle('lunch')}
              disabled={isLunchLocked}
              aria-readonly={isLunchLocked}
            />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-4 rounded-lg ${isDinnerLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="dinner-mode" className="text-lg font-medium">Dinner</Label>
                <p className="text-sm text-muted-foreground">Cut-off time: 8:00 PM. {isDinnerLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="dinner-mode"
              checked={meals.dinner}
              onCheckedChange={() => handleMealToggle('dinner')}
              disabled={isDinnerLocked}
              aria-readonly={isDinnerLocked}
            />
          </div>
        </CardContent>
      </Card>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className='font-headline'>Meal Ledger</AlertTitle>
        <AlertDescription>
          All your meal ON/OFF actions are automatically saved and timestamped in your personal Meal Ledger, which is visible to you and the mess manager. If you miss a cut-off time, please contact your manager for assistance.
        </AlertDescription>
      </Alert>
    </div>
  );
}
