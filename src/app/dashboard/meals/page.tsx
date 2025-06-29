
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    getUserProfile, 
    getTodaysMealStatus, 
    updateMealForToday, 
    getMessById,
    getMealHistoryForMess,
    type MealStatus,
    type MealSettings,
    type UserProfile,
    type MessMealHistoryEntry
} from '@/services/messService';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

type MealType = keyof MealStatus;

export default function MealsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealStatus | null>(null);
  const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
  const [mealHistory, setMealHistory] = useState<MessMealHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState<Partial<Record<MealType, boolean>>>({});
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
      setLoadingHistory(true);
      
      const messId = userProfile.messId;

      Promise.all([
        getTodaysMealStatus(messId, user.uid),
        getMessById(messId),
        getMealHistoryForMess(messId, 7)
      ]).then(([mealStatus, messData, historyData]) => {
        setMeals(mealStatus);
        setMealSettings(messData?.mealSettings || null);
        setMealHistory(historyData);
      }).catch(err => {
        console.error("Failed to fetch meal data", err);
        toast({ title: "Error", description: "Could not load your meal data.", variant: "destructive" });
      }).finally(() => {
        setLoading(false);
        setLoadingHistory(false);
      });
    }
  }, [user, userProfile, toast]);

  const handleMealCountChange = async (meal: MealType, value: string) => {
    if (!user || !userProfile?.messId || !meals) return;

    const newCount = parseFloat(value);
    if (isNaN(newCount) || newCount < 0) {
        // Revert invalid input without showing a toast for better UX
        // The UI will snap back to the previous valid state.
        setMeals(prev => ({...prev!}));
        return;
    }
    
    setSubmitting(prev => ({ ...prev, [meal]: true }));
    const originalCount = meals[meal];

    // Optimistic UI update
    setMeals(prev => prev ? { ...prev, [meal]: newCount } : null);

    try {
      await updateMealForToday(userProfile.messId, user.uid, meal, newCount);
    } catch (error) {
      console.error("Failed to update meal status:", error);
      // Revert on error
      setMeals(prev => prev ? { ...prev, [meal]: originalCount } : null);
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
  
  const MealCountControl = ({ meal, isLocked }: { meal: MealType; isLocked: boolean }) => (
    <Input
      id={`${meal}-count`}
      type="number"
      step="0.5"
      min="0"
      value={meals?.[meal] ?? 0}
      onChange={(e) => setMeals(prev => prev ? { ...prev, [meal]: e.target.valueAsNumber } : null)}
      onBlur={(e) => handleMealCountChange(meal, e.target.value)}
      disabled={isLocked || submitting[meal]}
      aria-readonly={isLocked}
      className="w-20 text-center"
    />
  );
  
  if (loading) {
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
            Set your meal count for today (e.g., 1 for full, 0.5 for half). Toggles lock after the cut-off time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between p-3 rounded-lg ${isBreakfastLocked ? 'bg-muted/50' : ''}`}>
            <div>
              <Label htmlFor="breakfast-count" className="text-base font-medium">Breakfast</Label>
              <p className="text-sm text-muted-foreground">Cut-off: {breakfastCutoffTime}. {isBreakfastLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <MealCountControl meal="breakfast" isLocked={isBreakfastLocked} />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-3 rounded-lg ${isLunchLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="lunch-count" className="text-base font-medium">Lunch</Label>
                <p className="text-sm text-muted-foreground">Cut-off: {lunchCutoffTime}. {isLunchLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <MealCountControl meal="lunch" isLocked={isLunchLocked} />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-3 rounded-lg ${isDinnerLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="dinner-count" className="text-base font-medium">Dinner</Label>
                <p className="text-sm text-muted-foreground">Cut-off: {dinnerCutoffTime}. {isDinnerLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <MealCountControl meal="dinner" isLocked={isDinnerLocked} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">All Meal Records</CardTitle>
            <CardDescription>Meal records for all members for the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-96">
                <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead className="text-center">Breakfast</TableHead>
                            <TableHead className="text-center">Lunch</TableHead>
                            <TableHead className="text-center">Dinner</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mealHistory.length > 0 ? mealHistory.map((entry, index) => (
                            <TableRow key={`${entry.date}-${entry.memberId}-${index}`}>
                                <TableCell className="font-medium">{format(parseISO(entry.date), 'EEE, MMM d')}</TableCell>
                                <TableCell>{entry.memberName}</TableCell>
                                <TableCell className="text-center font-mono">{entry.breakfast}</TableCell>
                                <TableCell className="text-center font-mono">{entry.lunch}</TableCell>
                                <TableCell className="text-center font-mono">{entry.dinner}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No meal records found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className='font-headline'>Meal Ledger</AlertTitle>
        <AlertDescription>
          Your personal meal counts are timestamped in your Meal Ledger. If you miss a cut-off time, please contact your manager to override your meal status on the 'Members' page.
        </AlertDescription>
      </Alert>
    </div>
  );
}
