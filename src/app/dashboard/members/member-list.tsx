
"use client";

import { useState } from "react";
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
import { type Member, type UserProfile } from "@/services/messService";
import { MealLedgerDialog } from './meal-ledger-dialog';
import { TransactionHistoryDialog } from "./transaction-history-dialog";


interface MemberListProps {
  members: Member[];
  messId: string;
  currentUserProfile: UserProfile;
  onUpdate: () => void;
}

export function MemberList({ members, messId, currentUserProfile, onUpdate }: MemberListProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);

  const handleViewLedger = (member: Member) => {
    setSelectedMember(member);
    setIsLedgerOpen(true);
  };
  
  const handleViewTransactions = (member: Member) => {
    setSelectedMember(member);
    setIsTransactionsOpen(true);
  };

  const isManager = currentUserProfile.role === 'manager';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Member List</CardTitle>
          <CardDescription>
            Here are all the members currently in your Mess.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Total Meals</TableHead>
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
                        <DropdownMenuItem onClick={() => handleViewTransactions(member)}>View Transactions</DropdownMenuItem>
                        {isManager && member.id !== currentUserProfile.uid && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500">
                                    Remove from Mess
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
      {selectedMember && (
        <TransactionHistoryDialog 
          isOpen={isTransactionsOpen}
          setIsOpen={setIsTransactionsOpen}
          member={selectedMember}
          messId={messId}
          currentUserProfile={currentUserProfile}
          onSuccess={() => {
            setIsTransactionsOpen(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
