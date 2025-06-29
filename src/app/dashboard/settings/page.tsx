"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Copy, Share2, UserCog, UserMinus, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';

const members = [
  { id: 2, name: "Karim Khan", role: "member", avatar: "https://placehold.co/40x40.png" },
  { id: 3, name: "Jabbar Ali", role: "member", avatar: "https://placehold.co/40x40.png" },
  { id: 4, name: "Salam Sheikh", role: "member", avatar: "https://placehold.co/40x40.png" },
  { id: 5, name: "Farah Ahmed", role: "member", avatar: "https://placehold.co/40x40.png" },
];

export default function SettingsPage() {
    const { toast } = useToast();
    const [transferInput, setTransferInput] = useState("");

    const handleCopy = () => {
        navigator.clipboard.writeText("XYZ-123-ABC");
        toast({
            title: "Copied!",
            description: "Invite code copied to clipboard.",
        });
    }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your mess settings and member roles.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Mess Information</CardTitle>
          <CardDescription>Update your mess's general details and invite codes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mess-name">Mess Name</Label>
            <Input id="mess-name" defaultValue="Bachelors Paradise" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-code">Mess Invite Code</Label>
            <div className="flex gap-2">
                <Input id="invite-code" readOnly value="XYZ-123-ABC" />
                <Button variant="outline" size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Meal Settings</CardTitle>
          <CardDescription>Set the cut-off times for daily meals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="breakfast-cutoff">Breakfast Cut-off</Label>
            <Input id="breakfast-cutoff" type="time" defaultValue="02:00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lunch-cutoff">Lunch Cut-off</Label>
            <Input id="lunch-cutoff" type="time" defaultValue="13:00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dinner-cutoff">Dinner Cut-off</Label>
            <Input id="dinner-cutoff" type="time" defaultValue="20:00" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Member Management</CardTitle>
          <CardDescription>Transfer manager role or remove members from the mess.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map(member => (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person portrait"/>
                                        <AvatarFallback>{member.name.substring(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{member.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="mr-2">
                                        <UserCog className="mr-2 h-4 w-4"/> Make Manager
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-headline flex items-center"><ShieldAlert className="mr-2 text-yellow-500" />Transfer Manager Role?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        You are about to make <strong>{member.name}</strong> the new manager of Bachelors Paradise. You will immediately lose all manager privileges and become a regular member. This action cannot be undone.
                                        <br/><br/>
                                        To confirm, please type <strong>TRANSFER</strong> in the box below.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Input 
                                        placeholder="Type TRANSFER to confirm" 
                                        value={transferInput}
                                        onChange={(e) => setTransferInput(e.target.value)}
                                    />
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setTransferInput("")}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction disabled={transferInput !== "TRANSFER"}>
                                        Confirm Transfer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="destructive" size="sm">
                                    <UserMinus className="mr-2 h-4 w-4"/> Remove
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card className="border-destructive">
          <CardHeader>
              <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete this Mess</p>
                <p className="text-sm text-muted-foreground">Once you delete a mess, there is no going back. Please be certain.</p>
              </div>
              <Button variant="destructive">Delete Mess</Button>
          </CardContent>
      </Card>
    </div>
  );
}
