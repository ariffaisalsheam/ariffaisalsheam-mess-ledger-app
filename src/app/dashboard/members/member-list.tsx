
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateMealForToday, type Member, type UserProfile, type MealStatus, type MealSettings } from "@/services/messService";
import { MealLedgerDialog } from './meal-ledger-dialog';
import { AddMealRecordDialog } from './add-meal-record-dialog';

type MealType = keyof MealStatus;

interface MemberListProps {
  members: Member[];
  messId: string;
  currentUserProfile: UserProfile;
  initialMealStatuses: Record<string, MealStatus>;
  mealSettings: MealSettings | null;
  onUpdate: () => void;
}

export function MemberList({ members, messId, currentUserProfile, initialMealStatuses, mealSettings, onUpdate }: MemberListProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isMealRecordDialogOpen, setIsMealRecordDialogOpen] = useState(false);
  const [mealStatuses, setMealStatuses] = useState(initialMealStatuses);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({}); // e.g., { 'memberId-breakfast': true }
  const { toast } = useToast();

  useEffect(() => {
    setMealStatuses(initialMealStatuses);
  }, [initialMealStatuses]);

  const handleViewLedger = (member: Member) => {
    setSelectedMember(member);
    setIsLedgerOpen(true);
  };
  
  const handleAddMealRecord = (member: Member) => {
    setSelectedMember(member);
    setIsMealRecordDialogOpen(true);
  };

  const isManager = currentUserProfile.role === 'manager';

  const handleMealOverride = async (memberId: string, meal: MealType, value: string) => {
    const newCount = parseFloat(value);
    if (isNaN(newCount) || newCount < 0) {
      setMealStatuses(prev => ({...prev})); // Revert UI
      return;
    }

    const originalStatus = mealStatuses[memberId];
    if (originalStatus === undefined || originalStatus[meal] === newCount) return;

    const submissionKey = `${memberId}-${meal}`;
    setSubmitting(prev => ({ ...prev, [submissionKey]: true }));
    
    // Optimistic UI update
    setMealStatuses(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || { breakfast: 0, lunch: 0, dinner: 0 }),
        [meal]: newCount
      }
    }));

    try {
      await updateMealForToday(messId, memberId, meal, newCount);
      toast({
          title: "Success",
          description: `Meal count updated for ${members.find(m => m.id === memberId)?.name}.`
      });
    } catch (error) {
      console.error("Failed to override meal status:", error);
      // Revert UI on error
      setMealStatuses(prev => ({ ...prev, [memberId]: originalStatus }));
      toast({
        title: "Update Failed",
        description: "Could not save the meal choice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(prev => ({ ...prev, [submissionKey]: false }));
    }
  };

  const MealOverrideInput = ({ memberId, meal }: { memberId: string, meal: MealType }) => {
    const submissionKey = `${memberId}-${meal}`;
    const mealCount = mealStatuses[memberId]?.[meal] ?? 0;

    return (
      <Input
        type="number"
        step="0.5"
        min="0"
        value={mealCount}
        onChange={(e) => setMealStatuses(prev => ({ ...prev, [memberId]: { ...prev[memberId], [meal]: e.target.valueAsNumber } }))}
        onBlur={(e) => handleMealOverride(memberId, meal, e.target.value)}
        disabled={!isManager || submitting[submissionKey]}
        aria-readonly={!isManager}
        className="h-7 w-12 text-center text-xs p-1"
      />
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Member List</CardTitle>
          <CardDescription>
            Here are all the members currently in your MessX. 
            {isManager 
              ? " As a manager, you can override their meal count for today." 
              : " Only managers can override meal counts."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Total Meals</TableHead>
                <TableHead className="text-center">Today's Meals (Override)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        {member.name}
                        {member.role === 'manager' && <span className="text-xs text-primary ml-2">(Manager)</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-bold ${member.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ৳{member.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">{member.meals.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                        {mealSettings?.isBreakfastOn && <>B<MealOverrideInput memberId={member.id} meal="breakfast" /></>}
                        {mealSettings?.isLunchOn && <>L<MealOverrideInput memberId={member.id} meal="lunch" /></>}
                        {mealSettings?.isDinnerOn && <>D<MealOverrideInput memberId={member.id} meal="dinner" /></>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewLedger(member)}>View Meal Ledger</DropdownMenuItem>
                        {isManager && (
                            <>
                                <DropdownMenuItem onClick={() => handleAddMealRecord(member)}>
                                    Add/Edit Meal Record
                                </DropdownMenuItem>
                                {member.id !== currentUserProfile.uid && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-500">
                                            Remove from MessX
                                        </DropdownMenuItem>
                                    </>
                                )}
                           </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedMember && (
        <MealLedgerDialog 
          isOpen={isLedgerOpen}
          setIsOpen={setIsLedgerOpen}
          messId={messId}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
        />
      )}
      {selectedMember && isManager && (
        <AddMealRecordDialog 
          isOpen={isMealRecordDialogOpen}
          setIsOpen={setIsMealRecordDialogOpen}
          messId={messId}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          onSuccess={onUpdate}
        />
      )}
    </>
  );
}
