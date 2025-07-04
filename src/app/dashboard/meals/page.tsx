
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Info, Loader2, Save, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    getUserProfile, 
    getTodaysMealStatus, 
    getMessById,
    getMealHistoryForMess,
    updateMealsForToday,
    updateMealForDate,
    type MealStatus,
    type MealSettings,
    type UserProfile,
    type MessMealHistoryEntry
} from '@/services/messService';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { AddMealRecordDialog } from '../members/add-meal-record-dialog';
import { Badge } from '@/components/ui/badge';

type MealType = keyof Omit<MealStatus, 'isSetByUser'>;

const MealCell = ({ personal, guest, isSet }: { personal?: number; guest?: number; isSet?: boolean }) => {
    const pVal = personal ?? 0;
    const gVal = guest ?? 0;
    
    // If user hasn't set meals and there are no guest meals, show X
    if (!isSet && gVal === 0) {
        return <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />;
    }
    
    const formatNum = (num: number) => num.toFixed(1).replace(/\.0$/, '');

    const personalDisplay = isSet ? formatNum(pVal) : '-';
    
    return (
        <>
            {personalDisplay}
            {gVal > 0 && (
                <span className="text-muted-foreground"> ({formatNum(gVal)})</span>
            )}
        </>
    );
};


export default function MealsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealStatus | null>(null);
  const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
  const [mealHistory, setMealHistory] = useState<MessMealHistoryEntry[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<Record<string, MessMealHistoryEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [isSaved, setIsSaved] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MessMealHistoryEntry | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  
  const fetchMealData = useCallback(() => {
    if (user && userProfile?.messId) {
        setLoading(true);
        const messId = userProfile.messId;
        getTodaysMealStatus(messId, user.uid).then(mealStatus => {
            setMeals(mealStatus);
            setIsSaved(mealStatus.isSetByUser || false);
        }).catch(err => {
            console.error("Failed to fetch today's meal status", err);
            toast({ title: "Error", description: "Could not load today's meal status.", variant: "destructive" });
        }).finally(() => {
            setLoading(false);
        });
    }
  }, [user, userProfile, toast]);

  const fetchHistoryData = useCallback(() => {
      if (userProfile?.messId) {
          setLoadingHistory(true);
          getMealHistoryForMess(userProfile.messId, 7).then(historyData => {
              setMealHistory(historyData);
          }).catch(err => {
              console.error("Failed to fetch meal history", err);
              toast({ title: "Error", description: "Could not load meal history.", variant: "destructive" });
          }).finally(() => {
              setLoadingHistory(false);
          });
      }
  }, [userProfile, toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth!, (currentUser) => { // Assert auth!
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
        fetchMealData();
        fetchHistoryData();
        getMessById(userProfile.messId).then(messData => {
            const defaultSettings: MealSettings = {
                breakfastCutoff: "02:00",
                lunchCutoff: "13:00",
                dinnerCutoff: "20:00",
                isBreakfastOn: true,
                isLunchOn: true,
                isDinnerOn: true,
                isCutoffEnabled: true,
            };
            setMealSettings({ ...defaultSettings, ...(messData?.mealSettings || {}) });
        });
    }
  }, [user, userProfile, fetchMealData, fetchHistoryData]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMealData();
        fetchHistoryData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMealData, fetchHistoryData]);

  useEffect(() => {
    const grouped = mealHistory.reduce((acc, entry) => {
        const date = entry.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(entry);
        return acc;
    }, {} as Record<string, MessMealHistoryEntry[]>);
    setGroupedHistory(grouped);
  }, [mealHistory]);

  const handleMealCountChange = (meal: MealType, value: string) => {
    const newCount = parseFloat(value);
    
    if (value === '') {
        setMeals(prev => prev ? { ...prev, [meal]: 0 } : null);
        setIsSaved(false);
        return;
    }

    if (!isNaN(newCount) && newCount >= 0) {
      setMeals(prev => prev ? { ...prev, [meal]: newCount } : null);
      setIsSaved(false);
    }
  };
  
  const handleSaveMeals = async () => {
      if (!user || !userProfile?.messId || !meals) return;
      
      setSubmitting({ 'save': true });
      try {
          await updateMealsForToday(userProfile.messId, user.uid, meals);
          toast({
              title: "Success",
              description: "Your meal choices for today have been saved."
          });
          setIsSaved(true);
          fetchMealData(); // Refresh data after saving
          fetchHistoryData(); // Refresh history
      } catch (error) {
          console.error("Failed to update meals:", error);
          toast({ title: "Update Failed", description: "Could not save your meal choices.", variant: "destructive" });
      } finally {
          setSubmitting({ 'save': false });
      }
  };
  
  const { isBreakfastLocked, isLunchLocked, isDinnerLocked, breakfastCutoffTime, lunchCutoffTime, dinnerCutoffTime } = useMemo(() => {
    if (!mealSettings) {
      return { isBreakfastLocked: true, isLunchLocked: true, isDinnerLocked: true, breakfastCutoffTime: 'N/A', lunchCutoffTime: 'N/A', dinnerCutoffTime: 'N/A' };
    }

    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const [bH, bM] = mealSettings.breakfastCutoff.split(':').map(Number);
    const breakfastCutoff = new Date();
    breakfastCutoff.setHours(bH, bM, 0, 0);

    const [lH, lM] = mealSettings.lunchCutoff.split(':').map(Number);
    const lunchCutoff = new Date();
    lunchCutoff.setHours(lH, lM, 0, 0);

    const [dH, dM] = mealSettings.dinnerCutoff.split(':').map(Number);
    const dinnerCutoff = new Date();
    dinnerCutoff.setHours(dH, dM, 0, 0);

    if (mealSettings.isCutoffEnabled === false) {
        return {
            isBreakfastLocked: false,
            isLunchLocked: false,
            isDinnerLocked: false,
            breakfastCutoffTime: formatTime(breakfastCutoff),
            lunchCutoffTime: formatTime(lunchCutoff),
            dinnerCutoffTime: formatTime(dinnerCutoff),
        };
    }
    
    const now = new Date();
    
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
      value={meals?.[meal] ?? ''}
      onChange={(e) => handleMealCountChange(meal, e.target.value)}
      disabled={isLocked || submitting['save']}
      aria-readonly={isLocked}
      className="w-20 text-center"
    />
  );

  const handleEdit = (record: MessMealHistoryEntry) => {
    setSelectedRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (record: MessMealHistoryEntry) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord || !userProfile?.messId) return;
    const key = `${selectedRecord.memberId}-${selectedRecord.date}`;
    setSubmitting(prev => ({ ...prev, [key]: true }));
    try {
        const clearedMeals: Partial<MealStatus> = {
            breakfast: 0, lunch: 0, dinner: 0,
            guestBreakfast: 0, guestLunch: 0, guestDinner: 0,
            isSetByUser: true
        };
        await updateMealForDate(userProfile.messId, selectedRecord.memberId, selectedRecord.date, clearedMeals);
        toast({ title: 'Success', description: 'Meal record has been cleared.' });
        fetchHistoryData();
    } catch (error) {
        console.error("Failed to delete record:", error);
        toast({ title: 'Error', description: 'Could not clear the record.', variant: 'destructive' });
    } finally {
        setSubmitting(prev => ({ ...prev, [key]: false }));
        setIsDeleteDialogOpen(false);
        setSelectedRecord(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const enabledMeals = (['breakfast', 'lunch', 'dinner'] as const).filter(meal => {
    switch (meal) {
        case 'breakfast': return mealSettings?.isBreakfastOn;
        case 'lunch': return mealSettings?.isLunchOn;
        case 'dinner': return mealSettings?.isDinnerOn;
        default: return false;
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div>
              <CardTitle className="font-headline">Today's Meals</CardTitle>
              <CardDescription>
                Set your meal count for today. Toggles lock after the cut-off time.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enabledMeals.length > 0 ? (
                enabledMeals.map((meal, index) => {
                    const isLocked = meal === 'breakfast' ? isBreakfastLocked : meal === 'lunch' ? isLunchLocked : isDinnerLocked;
                    const cutoffTime = meal === 'breakfast' ? breakfastCutoffTime : meal === 'lunch' ? lunchCutoffTime : dinnerCutoffTime;
                    
                    return (
                        <React.Fragment key={meal}>
                            <div className={`flex items-center justify-between p-3 rounded-lg ${isLocked ? 'bg-muted/50' : ''}`}>
                                <div>
                                    <Label htmlFor={`${meal}-count`} className="text-base font-medium capitalize">{meal}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        { mealSettings?.isCutoffEnabled ? (
                                            <>
                                                Cut-off: {cutoffTime}. {isLocked && <span className="font-bold text-destructive">Locked.</span>}
                                            </>
                                        ) : (
                                            'Cut-off times are disabled by manager.'
                                        )}
                                    </p>
                                </div>
                                <MealCountControl meal={meal as MealType} isLocked={isLocked} />
                            </div>
                            {index < enabledMeals.length - 1 && <Separator />}
                        </React.Fragment>
                    )
                })
            ) : (
                <p className="text-center text-muted-foreground py-4">All meals are currently disabled by the manager.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex items-center gap-4">
            <Button onClick={handleSaveMeals} disabled={isSaved || submitting['save']}>
                {submitting['save'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Save Choices
            </Button>
            {isSaved && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"><CheckCircle className="mr-1 h-4 w-4" /> Saved</Badge>}
        </CardFooter>
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
             <Accordion type="single" collapsible className="w-full">
                {Object.keys(groupedHistory).length > 0 ? Object.entries(groupedHistory).map(([date, entries]) => (
                    <AccordionItem value={date} key={date}>
                        <AccordionTrigger className="font-headline text-lg">
                            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                        </AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        {mealSettings?.isBreakfastOn && <TableHead className="text-center">Breakfast (Guest)</TableHead>}
                                        {mealSettings?.isLunchOn && <TableHead className="text-center">Lunch (Guest)</TableHead>}
                                        {mealSettings?.isDinnerOn && <TableHead className="text-center">Dinner (Guest)</TableHead>}
                                        {userProfile?.role === 'manager' && <TableHead className="text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map(entry => (
                                        <TableRow key={entry.memberId}>
                                            <TableCell className="font-medium">{entry.memberName}</TableCell>
                                            {mealSettings?.isBreakfastOn && <TableCell className="text-center font-mono">
                                                <MealCell personal={entry.breakfast} guest={entry.guestBreakfast} isSet={entry.isSetByUser} />
                                            </TableCell>}
                                            {mealSettings?.isLunchOn && <TableCell className="text-center font-mono">
                                                <MealCell personal={entry.lunch} guest={entry.guestLunch} isSet={entry.isSetByUser} />
                                            </TableCell>}
                                            {mealSettings?.isDinnerOn && <TableCell className="text-center font-mono">
                                                <MealCell personal={entry.dinner} guest={entry.guestDinner} isSet={entry.isSetByUser} />
                                            </TableCell>}
                                            {userProfile?.role === 'manager' && (
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} disabled={submitting[`${entry.memberId}-${entry.date}`]}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry)} className="text-destructive hover:text-destructive" disabled={submitting[`${entry.memberId}-${entry.date}`]}>
                                                        {submitting[`${entry.memberId}-${entry.date}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                )) : (
                    <p className="text-center text-muted-foreground py-8">No meal records found for the last 7 days.</p>
                )}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      {selectedRecord && userProfile?.messId && (
        <AddMealRecordDialog
            isOpen={isEditDialogOpen}
            setIsOpen={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setSelectedRecord(null); // Clear selection on close
            }}
            messId={userProfile.messId}
            memberId={selectedRecord.memberId}
            memberName={selectedRecord.memberName}
            initialDate={selectedRecord.date}
            mealSettings={mealSettings}
            onSuccess={fetchHistoryData}
        />
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will clear the meal record for <strong>{selectedRecord?.memberName}</strong> on {selectedRecord?.date ? format(parseISO(selectedRecord.date), 'PPP') : ''}. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedRecord(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className='font-headline'>Meal Ledger</AlertTitle>
        <AlertDescription>
          {mealSettings?.isCutoffEnabled
            ? "Your personal meal counts are timestamped in your Meal Ledger. If you miss a cut-off time, please contact your manager to override your meal status on the 'Members' page."
            : "Your personal meal counts are timestamped in your Meal Ledger. Cut-off times are currently disabled by the manager, so you can adjust your meals for today at any time."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
