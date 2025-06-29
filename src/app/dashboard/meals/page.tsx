
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
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

export default function MealsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealStatus | null>(null);
  const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
  const [mealHistory, setMealHistory] = useState<MessMealHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
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

  const handleMealToggle = async (meal: keyof MealStatus) => {
    if (!user || !userProfile?.messId || !meals) return;
    
    setSubmitting(prev => ({ ...prev, [meal]: true }));
    const newStatus = !meals[meal];

    setMeals(prev => prev ? { ...prev, [meal]: newStatus } : null);

    try {
      await updateMealForToday(userProfile.messId, user.uid, meal, newStatus);
    } catch (error) {
      console.error("Failed to update meal status:", error);
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
  
  const MealIcon = ({ status }: { status: boolean }) => {
    return status 
      ? <CheckCircle className="h-5 w-5 text-green-500" /> 
      : <XCircle className="h-5 w-5 text-red-500" />;
  };
  
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
            Turn your meals ON or OFF for today. Toggles lock after the cut-off time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between p-3 rounded-lg ${isBreakfastLocked ? 'bg-muted/50' : ''}`}>
            <div>
              <Label htmlFor="breakfast-mode" className="text-base font-medium">Breakfast</Label>
              <p className="text-sm text-muted-foreground">Cut-off time: {breakfastCutoffTime}. {isBreakfastLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="breakfast-mode"
              checked={meals?.breakfast ?? false}
              onCheckedChange={() => handleMealToggle('breakfast')}
              disabled={isBreakfastLocked || submitting.breakfast}
              aria-readonly={isBreakfastLocked}
            />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-3 rounded-lg ${isLunchLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="lunch-mode" className="text-base font-medium">Lunch</Label>
                <p className="text-sm text-muted-foreground">Cut-off time: {lunchCutoffTime}. {isLunchLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="lunch-mode"
              checked={meals?.lunch ?? false}
              onCheckedChange={() => handleMealToggle('lunch')}
              disabled={isLunchLocked || submitting.lunch}
              aria-readonly={isLunchLocked}
            />
          </div>
          <Separator />
          <div className={`flex items-center justify-between p-3 rounded-lg ${isDinnerLocked ? 'bg-muted/50' : ''}`}>
            <div>
                <Label htmlFor="dinner-mode" className="text-base font-medium">Dinner</Label>
                <p className="text-sm text-muted-foreground">Cut-off time: {dinnerCutoffTime}. {isDinnerLocked && <span className="font-bold text-destructive">Locked.</span>}</p>
            </div>
            <Switch
              id="dinner-mode"
              checked={meals?.dinner ?? false}
              onCheckedChange={() => handleMealToggle('dinner')}
              disabled={isDinnerLocked || submitting.dinner}
              aria-readonly={isDinnerLocked}
            />
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
                                <TableCell className="text-center"><MealIcon status={entry.breakfast} /></TableCell>
                                <TableCell className="text-center"><MealIcon status={entry.lunch} /></TableCell>
                                <TableCell className="text-center"><MealIcon status={entry.dinner} /></TableCell>
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
          Your personal meal toggles are timestamped in your Meal Ledger. If you miss a cut-off time, please contact your manager to override your meal status on the 'Members' page.
        </AlertDescription>
      </Alert>
    </div>
  );
}
