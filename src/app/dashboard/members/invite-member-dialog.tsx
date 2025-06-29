
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteMemberDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messName: string;
  inviteCode: string;
}

export function InviteMemberDialog({ isOpen, setIsOpen, messName, inviteCode }: InviteMemberDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard.",
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: `Join ${messName} on Mess Ledger`,
      text: `Join our mess "${messName}" on Mess Ledger with this code: ${inviteCode}`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error("Error sharing:", error);
        handleCopy();
        toast({
          title: "Sharing failed",
          description: "Invite code copied to clipboard instead.",
          variant: "destructive"
        });
      }
    } else {
      handleCopy();
      toast({
        title: "Share not supported",
        description: "Invite code copied to clipboard instead.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Invite New Members</DialogTitle>
          <DialogDescription>
            Share this invite code with people you want to join your mess, "{messName}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="invite-code" className="text-muted-foreground">Invite Code</Label>
          <div className="flex items-center space-x-2">
            <Input id="invite-code" value={inviteCode} readOnly className="uppercase text-lg font-mono tracking-widest"/>
            <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy</span>
            </Button>
            <Button type="button" size="icon" variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Share</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
