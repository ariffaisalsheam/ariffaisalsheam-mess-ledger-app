"use client";

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
import type { Member } from "@/services/messService";

export function MemberList({ members }: { members: Member[] }) {
  return (
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
  );
}
