
"use client"

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Plus, UserPlus, Wallet, Receipt, Coins, UtensilsCrossed } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  getUserProfile,
  getMemberDetails,
  getExpenses,
  getDeposits,
  getMessById,
  type UserProfile,
  type Member,
  type Expense,
  type Deposit,
  type Mess,
} from "@/services/messService";
import { format } from 'date-fns';
import { AddDepositDialog } from "./add-deposit-dialog";
import { AddExpenseDialog } from "./add-expense-dialog";
import { LogGuestMealDialog } from "./log-guest-meal-dialog";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberDetails, setMemberDetails] = useState<Member | null>(null);
  const [mess, setMess] = useState<Mess | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isDepositDialogOpen, setDepositDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [isGuestMealDialogOpen, setGuestMealDialogOpen] = useState(false);
  const [isFabOpen, setFabOpen] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async (messId: string, uid: string) => {
      try {
          const [details, messData, expensesData, depositsData] = await Promise.all([
              getMemberDetails(messId, uid),
              getMessById(messId),
              getExpenses(messId, 10), // Fetch only the 10 most recent
              getDeposits(messId, 10), // Fetch only the 10 most recent
          ]);
          setMemberDetails(details);
          setMess(messData);
          setExpenses(expensesData);
          setDeposits(depositsData);
      } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
      }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getUserProfile(user.uid).then(profile => {
        setUserProfile(profile);
        if (profile?.messId) {
          fetchData(profile.messId, user.uid).finally(() => setLoading(false));
        } else if (profile) {
          router.push("/welcome");
        } else {
          setLoading(false);
        }
      });
    }
  }, [user, router, fetchData]);
  
  const handleSuccess = () => {
    if (user && userProfile?.messId) {
      fetchData(userProfile.messId, user.uid);
      setFabOpen(false); // Close FAB menu on success
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const summary = mess?.summary;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const totalDeposits = summary?.totalDeposits ?? 0;
  const totalMessMeals = summary?.totalMeals ?? 0;
  const mealRate = summary?.mealRate ?? 0;
  
  const totalMessBalance = totalDeposits - totalExpenses;
  const balanceProgress = totalDeposits > 0 ? (totalMessBalance / totalDeposits) * 100 : 0;

  return (
    <>
      {user && userProfile?.messId && (
        <>
            <AddDepositDialog 
                isOpen={isDepositDialogOpen}
                setIsOpen={setDepositDialogOpen}
                messId={userProfile.messId}
                userId={user.uid}
                onSuccess={handleSuccess}
            />
            <AddExpenseDialog 
                isOpen={isExpenseDialogOpen}
                setIsOpen={setExpenseDialogOpen}
                messId={userProfile.messId}
                userId={user.uid}
                onSuccess={handleSuccess}
            />
            <LogGuestMealDialog
                isOpen={isGuestMealDialogOpen}
                setIsOpen={setGuestMealDialogOpen}
                messId={userProfile.messId}
                userId={user.uid}
                onSuccess={handleSuccess}
                mealSettings={mess?.mealSettings || null}
            />
             <Popover open={isFabOpen} onOpenChange={setFabOpen}>
                <PopoverTrigger asChild>
                     <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-20">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Transaction</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 mb-2" align="end" side="top">
                    <div className="flex flex-col gap-1">
                         <Button variant="ghost" className="justify-start" onClick={() => { setGuestMealDialogOpen(true); }}>
                            <UserPlus className="mr-2 h-4 w-4" /> Log Guest Meal
                        </Button>
                        <Button variant="ghost" className="justify-start" onClick={() => { setDepositDialogOpen(true); }}>
                            <Wallet className="mr-2 h-4 w-4" /> Add My Deposit
                        </Button>
                        <Button variant="ghost" className="justify-start" onClick={() => { setExpenseDialogOpen(true); }}>
                            <Receipt className="mr-2 h-4 w-4" /> Add Mess Expense
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </>
      )}
      <div className="flex flex-col gap-6">
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="font-headline">Mess Financial Summary</CardTitle>
                <CardDescription>An overview of your mess's current financial status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                    <p className={`text-4xl font-bold ${totalMessBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ৳{totalMessBalance.toFixed(2)}
                    </p>
                </div>
                <Progress value={balanceProgress} aria-label={`${balanceProgress.toFixed(0)}% of funds remaining`} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6 pt-2">
                    <div className="flex items-start gap-3">
                        <Coins className="h-5 w-5 text-primary mt-1 flex-shrink-0"/>
                        <div>
                            <p className="text-sm text-muted-foreground">Meal Rate</p>
                            <p className="text-lg font-bold">৳{mealRate.toFixed(2)}</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <UtensilsCrossed className="h-5 w-5 text-primary mt-1 flex-shrink-0"/>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Meals</p>
                            <p className="text-lg font-bold">{totalMessMeals}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="h-5 w-5 mt-1 flex-shrink-0 rounded-full bg-destructive/20 flex items-center justify-center">
                          <p className="font-bold text-destructive text-sm">-</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Expenses</p>
                            <p className="text-lg font-bold">৳{totalExpenses.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="h-5 w-5 mt-1 flex-shrink-0 rounded-full bg-success/20 flex items-center justify-center">
                          <p className="font-bold text-success text-sm">+</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Deposits</p>
                            <p className="text-lg font-bold">৳{totalDeposits.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <h2 className="text-2xl font-headline font-semibold flex-1">Recent Activity</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline">Mess Expenses</CardTitle>
              <CardDescription>Last 10 approved expenses.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ScrollArea className="h-72">
                {expenses.length > 0 ? (
                  <div className="space-y-4">
                    {expenses.map((expense, index) => (
                      <div key={expense.id}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">Added by {expense.addedBy}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-destructive">- ৳{expense.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "PPP")}</p>
                          </div>
                        </div>
                        {index < expenses.length - 1 && <Separator className="my-3" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                      No expenses recorded yet.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline">Member Deposits</CardTitle>
              <CardDescription>Last 10 approved deposits.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ScrollArea className="h-72">
                  {deposits.length > 0 ? (
                      <div className="space-y-4">
                          {deposits.map((deposit, index) => (
                          <div key={deposit.id}>
                              <div className="flex justify-between items-center">
                              <div>
                                  <p className="font-medium">{deposit.memberName}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-bold text-lg text-success">+ ৳{deposit.amount.toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">{format(new Date(deposit.date), "PPP")}</p>
                              </div>
                              </div>
                              {index < deposits.length - 1 && <Separator className="my-3" />}
                          </div>
                          ))}
                      </div>
                  ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                          No deposits recorded yet.
                      </div>
                  )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
