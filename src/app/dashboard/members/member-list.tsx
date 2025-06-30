
"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, BookOpen, Receipt, Utensils, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Member, type UserProfile, removeMemberFromMess } from "@/services/messService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MemberListProps {
  members: Member[];
  messId: string;
  currentUserProfile: UserProfile;
  onUpdate: () => void;
  onAction: (dialog: 'mealRecord' | 'transactions' | 'ledger', member: Member) => void;
}

export const MemberList = React.memo(function MemberList({ members, messId, currentUserProfile, onUpdate, onAction }: MemberListProps) {
  const isManager = currentUserProfile.role === 'manager';
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemoveMember = async (member: Member) => {
    setIsSubmitting(true);
    try {
      await removeMemberFromMess(messId, member.id);
      toast({ title: "Success!", description: `${member.name} has been removed from the mess.` });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove member.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Member List</CardTitle>
        <CardDescription>
          Here are all the members currently in your mess.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Total Meals</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold">{member.name}</span>
                      {member.role === 'manager' && <span className="text-xs text-primary ml-2 font-normal">(Manager)</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={`text-right font-mono font-bold text-lg ${member.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ৳{member.balance.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-mono text-lg">{member.meals.toFixed(1).replace(/\.0$/, '')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu for {member.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => onAction('ledger', member)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        View Meal Ledger
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onAction('transactions', member)}>
                        <Receipt className="mr-2 h-4 w-4" />
                        View Transactions
                      </DropdownMenuItem>
                      {isManager && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onAction('mealRecord', member)}>
                                <Utensils className="mr-2 h-4 w-4"/>
                                Add/Edit Meal Record
                            </DropdownMenuItem>
                            {member.id !== currentUserProfile.uid && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                        >
                                            <UserMinus className="mr-2 h-4 w-4"/>
                                            Remove from Mess
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove <strong>{member.name}</strong> from the mess? This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handleRemoveMember(member)}
                                                disabled={isSubmitting}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Confirm Removal
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
  );
});
