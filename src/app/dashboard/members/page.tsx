"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { UserCog, Loader2 } from "lucide-react";
import { MemberList } from './member-list';
import { getMembersOfMess, getUserProfile } from '@/services/messService';
import type { Member, UserProfile } from '@/services/messService';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      router.push('/login');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        getUserProfile(user.uid).then(profile => {
          if (profile && profile.messId) {
            getMembersOfMess(profile.messId).then(fetchedMembers => {
              setMembers(fetchedMembers);
              setLoading(false);
            });
          } else {
            // Not in a mess, or no profile
            router.push('/welcome');
          }
        });
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button>
          <UserCog className="mr-2 h-4 w-4" /> Invite New Member
        </Button>
      </div>
      <MemberList members={members} />
    </div>
  );
}
