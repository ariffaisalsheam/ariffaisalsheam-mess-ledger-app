"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlusCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  getUserProfile,
  getMemberDetails,
  getExpenses,
  getDeposits,
  type UserProfile,
  type Member,
  type Expense,
  type Deposit
} from "@/services/messService";
import { format } from 'date-fns';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberDetails, setMemberDetails] = useState<Member | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const router = useRouter();

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
      getUserProfile(user.uid).then(profile => {
        setUserProfile(profile);
        if (profile?.messId) {
          const messId = profile.messId;
          Promise.all([
            getMemberDetails(messId, user.uid),
            getExpenses(messId),
            getDeposits(messId)
          ]).then(([details, expensesData, depositsData]) => {
            setMemberDetails(details);
            setExpenses(expensesData);
            setDeposits(depositsData);
            setLoading(false);
          });
        } else if (profile) {
          router.push("/welcome");
        } else {
            setLoading(false);
        }
      });
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const userBalance = memberDetails?.balance ?? 0;
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalDeposits = deposits.reduce((sum, item) => sum + item.amount, 0);
  // meal rate calculation will be implemented later
  const mealRate = 43.20; 

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
            <span className={`text-lg ${userBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>৳</span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${userBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {userBalance >= 0 ? '+' : '-'}৳{Math.abs(userBalance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Your current standing in the MessX</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Meal Rate</CardTitle>
            <span className="text-lg text-primary">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{mealRate.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Based on total expenses and meals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <span className="text-lg text-red-500">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total spending this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <span className="text-lg text-blue-500">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalDeposits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total money pooled this month</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center gap-4">
          <h2 className="text-2xl font-headline font-semibold flex-1">Activity Feed</h2>
          <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add My Deposit
          </Button>
          <Button variant="secondary">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
          </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline">MessX Expenses</CardTitle>
            <CardDescription>All approved expenses added by members.</CardDescription>
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
                          <p className="font-bold text-lg text-red-600">- ৳{expense.amount.toFixed(2)}</p>
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
            <CardDescription>All approved deposits from members.</CardDescription>
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
                                <p className="font-bold text-lg text-green-600">+ ৳{deposit.amount.toFixed(2)}</p>
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
  );
}
