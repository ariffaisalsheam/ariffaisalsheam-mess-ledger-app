"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

const members = [
  { id: 1, name: "Rahim Doe", role: "manager", balance: 500, meals: 25, avatar: "https://placehold.co/40x40.png" },
  { id: 2, name: "Karim Khan", role: "member", balance: -120, meals: 30, avatar: "https://placehold.co/40x40.png" },
  { id: 3, name: "Jabbar Ali", role: "member", balance: 80, meals: 22, avatar: "https://placehold.co/40x40.png" },
  { id: 4, name: "Salam Sheikh", role: "member", balance: -300, meals: 28, avatar: "https://placehold.co/40x40.png" },
  { id: 5, name: "Farah Ahmed", role: "member", balance: 150, meals: 26, avatar: "https://placehold.co/40x40.png" },
];

export default function MembersPage() {
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

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Member List</CardTitle>
          <CardDescription>
            Here are all the members currently in your MessX. As a manager, you can override their meal status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Total Meals</TableHead>
                <TableHead className="text-center">Meal Override</TableHead>
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
                        <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
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
                        B<Switch className="scale-75" />
                        L<Switch className="scale-75" defaultChecked />
                        D<Switch className="scale-75" />
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
                        <DropdownMenuItem>View Meal Ledger</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500">
                          Remove from MessX
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
