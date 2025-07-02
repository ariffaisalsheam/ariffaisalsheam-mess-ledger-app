
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserProfile, generateMonthlyReport, getMessById, invalidateMonthlyReportCache, type UserProfile, type MonthlyReport, type Expense, type Deposit } from '@/services/messService';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Logo } from '@/components/logo';

export default function ReportsPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [messName, setMessName] = useState('');
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [regenerating, setRegenerating] = useState(false); // New state for regeneration
    const [selectedMonth, setSelectedMonth] = useState<string>(`${new Date().getFullYear()}-${new Date().getMonth()}`);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth!, (currentUser) => { // Assert auth!
            if (currentUser) {
                setLoading(true);
                getUserProfile(currentUser.uid).then(async (profile) => {
                    setUserProfile(profile);
                    if (profile?.messId) {
                        const mess = await getMessById(profile.messId);
                        if(mess) setMessName(mess.name);
                    } else {
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
    
    const handleGenerateReport = useCallback(async (forceRegenerate: boolean = false) => {
        if (!userProfile?.messId || generating) return;

        setGenerating(true);
        setReport(null);
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            
            if (forceRegenerate) {
                setRegenerating(true);
                toast({ title: "Invalidating Cache", description: "Clearing previous report data..." });
                await invalidateMonthlyReportCache(userProfile.messId, year, month);
                toast({ title: "Cache Invalidated", description: "Generating fresh report now." });
            } else {
                toast({ title: "Generating Report", description: "Fetching records... this may take a moment for the first time." });
            }

            const reportData = await generateMonthlyReport(userProfile.messId, year, month);
            setReport(reportData);
            toast({ title: "Report Ready", description: "Your monthly report has been generated successfully." });
        } catch (error) {
            console.error("Failed to generate report:", error);
            toast({ title: "Error", description: "Could not generate the report. Please try again.", variant: "destructive" });
        } finally {
            setGenerating(false);
            setRegenerating(false);
        }
    }, [userProfile, selectedMonth, toast, generating]);

    const handleRegenerateReport = useCallback(() => {
        handleGenerateReport(true); // Call with forceRegenerate = true
    }, [handleGenerateReport]);

    const handleDownload = async () => {
        const reportElement = document.getElementById('pdf-content');
        if (!reportElement || !report) {
            toast({ title: "Error", description: "Report content not found.", variant: "destructive" });
            return;
        }
    
        setDownloading(true);
        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                height: reportElement.scrollHeight,
                windowHeight: reportElement.scrollHeight,
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const PADDING = 15;
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const pageDrawableHeight = pdfHeight - PADDING * 2;
            
            const contentWidth = pdfWidth - PADDING * 2;
            const contentHeight = canvas.height * contentWidth / canvas.width;
            
            let heightLeft = contentHeight;
            let position = 0;
    
            pdf.addImage(imgData, 'JPEG', PADDING, PADDING, contentWidth, contentHeight);
            heightLeft -= pageDrawableHeight;
    
            while (heightLeft > 0) {
                position -= pageDrawableHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', PADDING, position + PADDING, contentWidth, contentHeight);
                heightLeft -= pageDrawableHeight;
            }
    
            pdf.save(`Mess-Report-${messName.replace(/\s/g, '_')}-${report.month}-${report.year}.pdf`);
        } catch(error) {
            console.error("Failed to download PDF:", error);
            toast({ title: "Download Failed", description: "Could not generate PDF for download.", variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    }
    
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i, 1);
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
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Generate Monthly Report</CardTitle>
                    <CardDescription>Select a month to generate a financial summary for your mess. Reports are cached after the first generation for faster access.</CardDescription>
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
                        <Button onClick={() => handleGenerateReport(false)} disabled={generating}>
                            {generating && !regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Generate Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {generating && (
                 <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg font-semibold">{regenerating ? "Invalidating cache and regenerating report..." : "Generating your report..."}</p>
                    <p className="text-muted-foreground">This might take a moment.</p>
                </div>
            )}
            
            {report && (
                <>
                {/* Visible Card for UI */}
                <Card id="report-content-ui">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="font-headline text-2xl">Mess Report: {report.month} {report.year}</CardTitle>
                                <CardDescription>A summary of all financial activities and meal counts for the selected month.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleDownload} variant="outline" disabled={downloading}>
                                    {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Download PDF
                                </Button>
                                <Button onClick={handleRegenerateReport} disabled={generating} variant="outline">
                                    {regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                    Regenerate Report
                                </Button>
                            </div>
                        </div>
                    </CardHeader> {/* Added missing closing tag */}
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-b pb-6">
                            <div><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">৳{report.totalExpenses.toFixed(2)}</p></div>
                            <div><p className="text-sm text-muted-foreground">Total Meals</p><p className="text-2xl font-bold">{report.totalMeals}</p></div>
                            <div><p className="text-sm text-muted-foreground">Meal Rate</p><p className="text-2xl font-bold">৳{report.mealRate.toFixed(2)}</p></div>
                            <div><p className="text-sm text-muted-foreground">Total Deposits</p><p className="text-2xl font-bold">৳{report.totalDeposits.toFixed(2)}</p></div>
                        </div>
                        <div>
                           <h3 className="text-lg font-headline mb-4">Member Breakdown</h3>
                           <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead className="text-right">Total Meals (Guests)</TableHead><TableHead className="text-right">Meal Cost</TableHead><TableHead className="text-right">Deposits</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader><TableBody>{report.memberReports.map(member => (<TableRow key={member.memberId}><TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={member.avatar} alt={member.memberName} data-ai-hint="person portrait" /><AvatarFallback>{member.memberName.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="font-medium">{member.memberName}</span></div></TableCell><TableCell className="text-right font-mono">{member.totalMeals}{member.totalGuestMeals > 0 && (<span className="text-muted-foreground"> ({member.totalGuestMeals})</span>)}</TableCell><TableCell className="text-right font-mono text-destructive">- ৳{member.mealCost.toFixed(2)}</TableCell><TableCell className="text-right font-mono text-success">+ ৳{member.totalDeposits.toFixed(2)}</TableCell><TableCell className={`text-right font-bold ${member.finalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>৳{member.finalBalance.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table></div>
                        </div>
                         <div className="pt-6 border-t">
                            <h3 className="text-lg font-headline mb-4">Transaction Details</h3>
                            <Tabs defaultValue="expenses">
                                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="expenses">Expenses ({report.expenses.length})</TabsTrigger><TabsTrigger value="deposits">Deposits ({report.deposits.length})</TabsTrigger></TabsList>
                                <TabsContent value="expenses" className="mt-4"><div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Added By</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{report.expenses.length > 0 ? report.expenses.map((expense: Expense) => (<TableRow key={expense.id}><TableCell>{format(new Date(expense.date), 'PP')}</TableCell><TableCell>{expense.description}</TableCell><TableCell>{expense.addedBy}</TableCell><TableCell className="text-right font-mono text-destructive">- ৳{expense.amount.toFixed(2)}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="text-center h-24">No expenses for this month.</TableCell></TableRow>)}</TableBody></Table></div></TabsContent>
                                <TabsContent value="deposits" className="mt-4"><div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{report.deposits.length > 0 ? report.deposits.map((deposit: Deposit) => (<TableRow key={deposit.id}><TableCell>{format(new Date(deposit.date), 'PP')}</TableCell><TableCell>{deposit.memberName}</TableCell><TableCell className="text-right font-mono text-success">+ ৳{deposit.amount.toFixed(2)}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={3} className="text-center h-24">No deposits for this month.</TableCell></TableRow>)}</TableBody></Table></div></TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                    <CardFooter><p className="text-xs text-muted-foreground">This report is based on approved expenses and deposits for the selected month.</p></CardFooter>
                </Card>

                {/* Hidden Div for PDF Generation */}
                <div className="absolute -left-[9999px] top-0 w-[800px] bg-white text-black font-sans p-8">
                    <div id="pdf-content">
                        <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4 mb-6">
                            <div className="flex items-center gap-4">
                                <Logo />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">Mess Ledger</h1>
                                    <p className="text-sm text-gray-500">Transparent Tracking, Effortless Settlement</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-bold">{messName}</h2>
                                <p className="text-lg text-gray-600">Monthly Report: {report.month} {report.year}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-center my-8 p-4 border border-gray-200 rounded-lg">
                            <div><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold">৳{report.totalExpenses.toFixed(2)}</p></div>
                            <div><p className="text-sm text-gray-500">Total Meals</p><p className="text-2xl font-bold">{report.totalMeals.toFixed(2)}</p></div>
                            <div><p className="text-sm text-gray-500">Meal Rate</p><p className="text-2xl font-bold">৳{report.mealRate.toFixed(2)}</p></div>
                            <div><p className="text-sm text-gray-500">Total Deposits</p><p className="text-2xl font-bold">৳{report.totalDeposits.toFixed(2)}</p></div>
                        </div>
                        
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 border-b pb-1">Member Breakdown</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200 bg-gray-50"><th className="text-left p-2 font-bold">Member</th><th className="text-right p-2 font-bold">Total Meals (Guests)</th><th className="text-right p-2 font-bold">Meal Cost</th><th className="text-right p-2 font-bold">Deposits</th><th className="text-right p-2 font-bold">Balance</th></tr></thead><tbody>{report.memberReports.map((member, index) => (<tr key={member.memberId} className={index % 2 !== 0 ? 'bg-gray-50' : ''}><td className="p-2 flex items-center gap-2"><img src={member.avatar} crossOrigin="anonymous" className="h-6 w-6 rounded-full" alt="" data-ai-hint="person portrait"/><span>{member.memberName}</span></td><td className="text-right p-2 font-mono">{member.totalMeals.toFixed(2)}{member.totalGuestMeals > 0 && (<span className="text-gray-500"> ({member.totalGuestMeals.toFixed(2)})</span>)}</td><td className="text-right p-2 font-mono text-red-600">-৳{member.mealCost.toFixed(2)}</td><td className="text-right p-2 font-mono text-green-600">+৳{member.totalDeposits.toFixed(2)}</td><td className={`text-right p-2 font-bold ${member.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>৳{member.finalBalance.toFixed(2)}</td></tr>))}</tbody></table></div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 border-b pb-1">Expenses Ledger</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200 bg-gray-50"><th className="text-left p-2 font-bold">Date</th><th className="text-left p-2 font-bold">Description</th><th className="text-left p-2 font-bold">Added By</th><th className="text-right p-2 font-bold">Amount</th></tr></thead><tbody>{report.expenses.length > 0 ? report.expenses.map((expense: Expense, index) => (<tr key={expense.id} className={index % 2 !== 0 ? 'bg-gray-50' : ''}><td className="p-2">{format(new Date(expense.date), 'PP')}</td><td className="p-2">{expense.description}</td><td className="p-2">{expense.addedBy}</td><td className="text-right p-2 font-mono text-red-600">-৳{expense.amount.toFixed(2)}</td></tr>)) : (<tr><td colSpan={4} className="text-center p-8 text-gray-500">No expenses for this month.</td></tr>)}</tbody></table></div>
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 border-b pb-1">Deposits Ledger</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200 bg-gray-50"><th className="text-left p-2 font-bold">Date</th><th className="text-left p-2 font-bold">Member</th><th className="text-right p-2 font-bold">Amount</th></tr></thead><tbody>{report.deposits.length > 0 ? report.deposits.map((deposit: Deposit, index) => (<tr key={deposit.id} className={index % 2 !== 0 ? 'bg-gray-50' : ''}><td className="p-2">{format(new Date(deposit.date), 'PP')}</td><td className="p-2">{deposit.memberName}</td><td className="text-right p-2 font-mono text-green-600">+৳{deposit.amount.toFixed(2)}</td></tr>)) : (<tr><td colSpan={3} className="text-center p-8 text-gray-500">No deposits for this month.</td></tr>)}</tbody></table></div>
                            </div>
                        </div>

                        <div className="mt-12 pt-4 border-t-2 border-gray-200 text-center text-xs text-gray-500">
                            <p>Report generated on {format(new Date(), 'PPp')}.</p>
                            <p>This report is based on approved expenses and deposits for the selected month.</p>
                        </div>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
