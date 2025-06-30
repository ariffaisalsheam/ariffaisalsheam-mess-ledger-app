
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import { MemberList } from './member-list';
import { getMembersOfMess, getUserProfile, getMessById, type Member, type UserProfile, type Mess } from '@/services/messService';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { InviteMemberDialog } from './invite-member-dialog';
import { AddMealRecordDialog } from './add-meal-record-dialog';
import { TransactionHistoryDialog } from './transaction-history-dialog';
import { MealLedgerDialog } from './meal-ledger-dialog';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [messData, setMessData] = useState<Mess | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);

  // State for dialogs
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isMealRecordDialogOpen, setMealRecordDialogOpen] = useState(false);
  const [isTransactionHistoryOpen, setTransactionHistoryOpen] = useState(false);
  const [isMealLedgerOpen, setMealLedgerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!auth) {
      router.push('/login');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  const fetchData = useCallback(() => {
    if (!authUser) return;

    setLoading(true);
    getUserProfile(authUser.uid).then(profile => {
      setUserProfile(profile);
      if (profile && profile.messId) {
        Promise.all([
          getMembersOfMess(profile.messId),
          getMessById(profile.messId)
        ]).then(([fetchedMembers, fetchedMessData]) => {
          setMembers(fetchedMembers);
          setMessData(fetchedMessData);
        }).catch(err => {
            console.error("Failed to load members page data", err);
        }).finally(() => {
          setLoading(false);
        });
      } else {
        router.push('/welcome');
      }
    });
  }, [authUser, router]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = useCallback((dialog: 'mealRecord' | 'transactions' | 'ledger', member: Member) => {
    setSelectedMember(member);
    if (dialog === 'mealRecord') setMealRecordDialogOpen(true);
    if (dialog === 'transactions') setTransactionHistoryOpen(true);
    if (dialog === 'ledger') setMealLedgerOpen(true);
  }, []);

  if (loading || !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isManager = userProfile?.role === 'manager';

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          {isManager && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite New Member
            </Button>
          )}
        </div>
        {userProfile?.messId && (
          <MemberList 
            members={members} 
            messId={userProfile.messId}
            currentUserProfile={userProfile}
            onUpdate={fetchData}
            onAction={handleOpenDialog}
          />
        )}
      </div>
      
      {messData && messData.inviteCode && (
        <InviteMemberDialog 
          isOpen={isInviteDialogOpen}
          setIsOpen={setInviteDialogOpen}
          messName={messData.name}
          inviteCode={messData.inviteCode}
        />
      )}
      {selectedMember && userProfile?.messId && (
          <>
            <AddMealRecordDialog
                isOpen={isMealRecordDialogOpen}
                setIsOpen={setMealRecordDialogOpen}
                messId={userProfile.messId}
                memberId={selectedMember.id}
                memberName={selectedMember.name}
                onSuccess={fetchData}
                mealSettings={messData?.mealSettings ?? null}
            />
            <TransactionHistoryDialog
                isOpen={isTransactionHistoryOpen}
                setIsOpen={setTransactionHistoryOpen}
                member={selectedMember}
                messId={userProfile.messId}
                currentUserProfile={userProfile}
                onSuccess={fetchData}
            />
             <MealLedgerDialog
                isOpen={isMealLedgerOpen}
                setIsOpen={setMealLedgerOpen}
                messId={userProfile.messId}
                memberId={selectedMember.id}
                memberName={selectedMember.name}
            />
          </>
      )}
    </>
  );
}
