"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";

const pendingExpenses = [
  { id: 1, submitter: "Karim Khan", amount: 350, description: "Cleaning Supplies", date: "2023-10-05" },
  { id: 2, submitter: "Salam Sheikh", amount: 150, description: "Guest Meal Charge", date: "2023-10-06" },
];

const pendingDeposits = [
  { id: 3, submitter: "Farah Ahmed", amount: 2000, date: "2023-10-05" },
];

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses ({pendingExpenses.length})</TabsTrigger>
          <TabsTrigger value="deposits">Deposits ({pendingDeposits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Pending Expenses</CardTitle>
              <CardDescription>Review these expense submissions. Approved items will be added to the main calculations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingExpenses.length > 0 ? pendingExpenses.map(item => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="flex-1">
                    <p className="font-bold text-xl">৳{item.amount.toFixed(2)}</p>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">Submitted by {item.submitter} on {item.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Reject</span>
                    </Button>
                    <Button variant="outline" size="icon" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="sr-only">Approve</span>
                    </Button>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-center py-8">No pending expenses to review.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Pending Deposits</CardTitle>
              <CardDescription>Review these deposit submissions. Approved amounts will be credited to the member's balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {pendingDeposits.length > 0 ? pendingDeposits.map(item => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="flex-1">
                    <p className="font-bold text-xl">৳{item.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Submitted by {item.submitter} on {item.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Reject</span>
                    </Button>
                    <Button variant="outline" size="icon" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="sr-only">Approve</span>
                    </Button>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-center py-8">No pending deposits to review.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
