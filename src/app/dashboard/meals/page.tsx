
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    getUserProfile, 
    getTodaysMealStatus, 
    updateMealForToday, 
    getMessById,
    type MealStatus,
    type MealSettings,
    type UserProfile
} from '@/services/messService';
import { useToast } from '@/hooks/use-toast';

export default function MealsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealStatus | null>(null);
  const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Partial<Record<keyof MealStatus, boolean>>>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        getUserProfile(currentUser.uid).then(setUserProfile);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user && userProfile?.messId) {
      setLoading(true);
      Promise.all([
        getTodaysMealStatus(userProfile.messId, user.uid),
        getMessById(userProfile.messId)
      ]).then(([mealStatus, messData]) => {
        setMeals(mealStatus);
        setMealSettings(messData?.mealSettings || null);
      }).catch(err => {
        console.error("Failed to fetch meal data", err);
        toast({ title: "Error", description: "Could not load your meal data.", variant: "destructive" });
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [user, userProfile, toast]);

  const handleMealToggle = async (meal: keyof MealStatus) => {
    if (!user || !userProfile?.messId || !meals) return;
    
    setSubmitting(prev => ({ ...prev, [meal]: true }));
    const newStatus = !meals[meal];

    // Optimistic UI update
    setMeals(prev => prev ? { ...prev, [meal]: newStatus } : null);

    try {
      await updateMealForToday(userProfile.messId, user.uid, meal, newStatus);
    } catch (error) {
      console.error("Failed to update meal status:", error);
      // Revert UI on error
      setMeals(prev => prev ? { ...prev, [meal]: !newStatus } : null);
      toast({
        title: "Update Failed",
        description: "Could not save your meal choice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(prev => ({ ...prev, [meal]: false }));
    }
  };

  const { isBreakfastLocked, isLunchLocked, isDinnerLocked, breakfastCutoffTime, lunchCutoffTime, dinnerCutoffTime } = useMemo(() => {
    if (!mealSettings) {
      return { isBreakfastLocked: true, isLunchLocked: true, isDinnerLocked: true, breakfastCutoffTime: 'N/A', lunchCutoffTime: 'N/A', dinnerCutoffTime: 'N/A' };
    }

    const now = new Date();
    const [bH, bM] = mealSettings.breakfastCutoff.split(':').map(Number);
    const breakfastCutoff = new Date();
    breakfastCutoff.setHours(bH, bM, 0, 0);

    const [lH, lM] = mealSettings.lunchCutoff.split(':').map(Number);
    const lunchCutoff = new Date();
    lunchCutoff.setHours(lH, lM, 0, 0);

    const [dH, dM] = mealSettings.dinnerCutoff.split(':').map(Number);
    const dinnerCutoff = new Date();
    dinnerCutoff.setHours(dH, dM, 0, 0);

    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return {
      isBreakfastLocked: now > breakfastCutoff,
      isLunchLocked: now > lunchCutoff,
      isDinnerLocked: now > dinnerCutoff,
      breakfastCutoffTime: formatTime(breakfastCutoff),
      lunchCutoffTime: formatTime(lunchCutoff),
      dinnerCutoffTime: formatTime(dinnerCutoff),
    };
  }, [mealSettings]);
  
  if (loading || !meals) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground">Cut-off time: {breakfastCutoffTime}. {isBreakfastLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="breakfast-mode"
              checked={meals.breakfast}
              onCheckedChange={() => handleMealToggle('breakfast')}
              disabled={isBreakfastLocked || submitting.breakfast}
              aria-readonly={isBreakfastLocked}
            />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-4 rounded-lg ${isLunchLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="lunch-mode" className="text-lg font-medium">Lunch</Label>
                <p className="text-sm text-muted-foreground">Cut-off time: {lunchCutoffTime}. {isLunchLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="lunch-mode"
              checked={meals.lunch}
              onCheckedChange={() => handleMealToggle('lunch')}
              disabled={isLunchLocked || submitting.lunch}
              aria-readonly={isLunchLocked}
            />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-4 rounded-lg ${isDinnerLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="dinner-mode" className="text-lg font-medium">Dinner</Label>
                <p className="text-sm text-muted-foreground">Cut-off time: {dinnerCutoffTime}. {isDinnerLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="dinner-mode"
              checked={meals.dinner}
              onCheckedChange={() => handleMealToggle('dinner')}
              disabled={isDinnerLocked || submitting.dinner}
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
