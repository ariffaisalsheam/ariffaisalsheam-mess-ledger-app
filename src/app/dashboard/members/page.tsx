import { getMembers } from '@/services/mess';
import { Button } from "@/components/ui/button";
import { UserCog } from "lucide-react";
import { MemberList } from './member-list';

export default async function MembersPage() {
  const members = await getMembers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">MessX Members</h1>
                <p className="text-muted-foreground">View and manage all members of your MessX.</p>
            </div>
            <Button>
                <UserCog className="mr-2 h-4 w-4" /> Invite New Member
            </Button>
      </div>
      <MemberList members={members} />
    </div>
  );
}
