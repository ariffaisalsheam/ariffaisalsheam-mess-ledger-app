
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updateMealForToday, type Member, type UserProfile, type MealStatus } from "@/services/messService";
import { MealLedgerDialog } from './meal-ledger-dialog';

interface MemberListProps {
  members: Member[];
  messId: string;
  currentUserProfile: UserProfile;
  initialMealStatuses: Record<string, MealStatus>;
}

export function MemberList({ members, messId, currentUserProfile, initialMealStatuses }: MemberListProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
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

  const isManager = currentUserProfile.role === 'manager';

  const handleMealOverride = async (memberId: string, meal: keyof MealStatus) => {
    const currentStatus = mealStatuses[memberId]?.[meal];
    if (currentStatus === undefined) return;

    const newStatus = !currentStatus;
    const submissionKey = `${memberId}-${meal}`;

    setSubmitting(prev => ({ ...prev, [submissionKey]: true }));
    
    // Optimistic UI update
    setMealStatuses(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || { breakfast: false, lunch: false, dinner: false }),
        [meal]: newStatus
      }
    }));

    try {
      await updateMealForToday(messId, memberId, meal, newStatus);
      toast({
          title: "Success",
          description: `Meal status updated for ${members.find(m => m.id === memberId)?.name}.`
      });
    } catch (error) {
      console.error("Failed to override meal status:", error);
      // Revert UI on error
      setMealStatuses(prev => ({
        ...prev,
        [memberId]: {
          ...(prev[memberId] || { breakfast: false, lunch: false, dinner: false }),
          [meal]: !newStatus
        }
      }));
      toast({
        title: "Update Failed",
        description: "Could not save the meal choice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(prev => ({ ...prev, [submissionKey]: false }));
    }
  };

  const MealOverrideSwitch = ({ memberId, meal }: { memberId: string, meal: keyof MealStatus }) => {
    const submissionKey = `${memberId}-${meal}`;
    const isChecked = mealStatuses[memberId]?.[meal] ?? false;

    return (
      <Switch
        className="scale-75"
        checked={isChecked}
        onCheckedChange={() => handleMealOverride(memberId, meal)}
        disabled={!isManager || submitting[submissionKey]}
        aria-readonly={!isManager}
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
              ? " As a manager, you can override their meal status for today." 
              : " Only managers can override meal statuses."
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
                  <TableCell className="text-center">{member.meals}</TableCell>
                  <TableCell>
                    <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                        B<MealOverrideSwitch memberId={member.id} meal="breakfast" />
                        L<MealOverrideSwitch memberId={member.id} meal="lunch" />
                        D<MealOverrideSwitch memberId={member.id} meal="dinner" />
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
                        {isManager && member.id !== currentUserProfile.uid && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500">
                                Remove from MessX
                                </DropdownMenuItem>
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
    </>
  );
}
