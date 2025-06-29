
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Printer, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserProfile, generateMonthlyReport, type UserProfile, type MonthlyReport } from '@/services/messService';

export default function ReportsPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(`${new Date().getFullYear()}-${new Date().getMonth()}`);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                getUserProfile(currentUser.uid).then(profile => {
                    setUserProfile(profile);
                    if (!profile?.messId) {
                        toast({ title: "No Mess Found", description: "You need to be in a mess to view reports.", variant: "destructive" });
                        router.push('/welcome');
                    }
                }).finally(() => setLoading(false));
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router, toast]);
    
    const handleGenerateReport = useCallback(async () => {
        if (!userProfile?.messId || generating) return;

        setGenerating(true);
        setReport(null);
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const reportData = await generateMonthlyReport(userProfile.messId, year, month);
            setReport(reportData);
        } catch (error) {
            console.error("Failed to generate report:", error);
            toast({ title: "Error", description: "Could not generate the report. Please try again.", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    }, [userProfile, selectedMonth, toast, generating]);

    const handlePrint = () => {
        window.print();
    }
    
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
            value: `${date.getFullYear()}-${date.getMonth()}`,
            label: date.toLocaleString('default', { month: 'long', year: 'numeric' })
        };
    });

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card className="print:shadow-none print:border-none">
                <CardHeader>
                    <CardTitle className="font-headline">Generate Monthly Report</CardTitle>
                    <CardDescription>Select a month to generate a financial summary for your mess.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="grid gap-2 flex-1 min-w-[200px]">
                            <label htmlFor="month-select" className="text-sm font-medium">Month</label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger id="month-select">
                                    <SelectValue placeholder="Select a month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleGenerateReport} disabled={generating}>
                            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Generate Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {generating && (
                 <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg font-semibold">Generating your report...</p>
                    <p className="text-muted-foreground">This might take a moment.</p>
                </div>
            )}

            {report && (
                <Card id="report-content" className="print:shadow-none print:border-none">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="font-headline text-2xl">Mess Report: {report.month} {report.year}</CardTitle>
                                <CardDescription>A summary of all financial activities and meal counts for the selected month.</CardDescription>
                            </div>
                            <Button onClick={handlePrint} variant="outline" className="print:hidden">
                                <Printer className="mr-2 h-4 w-4" /> Print
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6">
                            {/* Summary Section */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-b pb-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                                    <p className="text-2xl font-bold">৳{report.totalExpenses.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Meals</p>
                                    <p className="text-2xl font-bold">{report.totalMeals.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Meal Rate</p>
                                    <p className="text-2xl font-bold">৳{report.mealRate.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Deposits</p>
                                    <p className="text-2xl font-bold">৳{report.totalDeposits.toFixed(2)}</p>
                                </div>
                            </div>
                            
                            {/* Member Breakdown Table */}
                            <div>
                               <h3 className="text-lg font-headline mb-4">Member Breakdown</h3>
                               <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Member</TableHead>
                                                <TableHead className="text-right">Meals</TableHead>
                                                <TableHead className="text-right">Meal Cost</TableHead>
                                                <TableHead className="text-right">Deposits</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.memberReports.map(member => (
                                                <TableRow key={member.memberId}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={member.avatar} alt={member.memberName} data-ai-hint="person portrait" />
                                                                <AvatarFallback>{member.memberName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{member.memberName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{member.totalMeals.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-500">- ৳{member.mealCost.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono text-green-500">+ ৳{member.totalDeposits.toFixed(2)}</TableCell>
                                                    <TableCell className={`text-right font-bold ${member.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        ৳{member.finalBalance.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                               </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="print:hidden">
                        <p className="text-xs text-muted-foreground">This report is based on approved expenses and deposits for the selected month.</p>
                    </CardFooter>
                </Card>
            )}
            <style jsx global>{`
                @media print {
                    body > *:not(#report-content) {
                        display: none;
                    }
                    #report-content {
                        display: block;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
