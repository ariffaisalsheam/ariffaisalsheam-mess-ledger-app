"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PlusCircle } from "lucide-react";

// Mock data
const expenses = [
  { id: 1, amount: 550, description: "Groceries for week 1", addedBy: "Rahim", date: "2023-10-01" },
  { id: 2, amount: 120, description: "Internet Bill", addedBy: "Karim", date: "2023-10-02" },
  { id: 3, amount: 800, description: "Fish and Meat", addedBy: "Rahim", date: "2023-10-03" },
  { id: 4, amount: 250, description: "Vegetables", addedBy: "Jabbar", date: "2023-10-04" },
];

const deposits = [
  { id: 1, amount: 2000, memberName: "Rahim Doe", date: "2023-10-01" },
  { id: 2, amount: 2000, memberName: "Karim Khan", date: "2023-10-01" },
  { id: 3, amount: 1500, memberName: "Jabbar Ali", date: "2023-10-03" },
  { id: 4, amount: 2000, memberName: "Salam Sheikh", date: "2023-10-04" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
            <span className="text-lg text-green-500">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+৳500.00</div>
            <p className="text-xs text-muted-foreground">Your current standing in the mess</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Meal Rate</CardTitle>
            <span className="text-lg text-primary">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳43.20</div>
            <p className="text-xs text-muted-foreground">Based on total expenses and meals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <span className="text-lg text-red-500">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳15,720.00</div>
            <p className="text-xs text-muted-foreground">Total spending this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <span className="text-lg text-blue-500">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳20,000.00</div>
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
            <CardTitle className="font-headline">Mess Expenses</CardTitle>
            <CardDescription>All approved expenses added by members.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-72">
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
                        <p className="text-xs text-muted-foreground">{expense.date}</p>
                      </div>
                    </div>
                    {index < expenses.length - 1 && <Separator className="my-3" />}
                  </div>
                ))}
              </div>
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
              <div className="space-y-4">
                {deposits.map((deposit, index) => (
                  <div key={deposit.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{deposit.memberName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600">+ ৳{deposit.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{deposit.date}</p>
                      </div>
                    </div>
                    {index < deposits.length - 1 && <Separator className="my-3" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
