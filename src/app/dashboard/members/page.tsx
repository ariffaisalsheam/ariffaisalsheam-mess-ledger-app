
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import { MemberList } from './member-list';
import { getMembersOfMess, getUserProfile, getMessById } from '@/services/messService';
import type { Member, UserProfile } from '@/services/messService';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { InviteMemberDialog } from './invite-member-dialog';

interface MessData {
    id: string;
    name: string;
    inviteCode?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [messData, setMessData] = useState<MessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);

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
          if (fetchedMessData) {
            setMessData(fetchedMessData as MessData);
          }
        }).catch(err => {
            console.error("Failed to load members page data", err);
        }).finally(() => {
          setLoading(false);
        });
      } else {
        // Not in a mess, or no profile
        router.push('/welcome');
      }
    });
  }, [authUser, router]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
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
    </>
  );
}
