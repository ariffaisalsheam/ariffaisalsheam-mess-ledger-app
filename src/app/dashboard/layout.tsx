"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  LogOut,
  Menu,
  Package2,
  Settings,
  Users,
  Utensils,
  Wallet,
  CheckSquare,
  Bell,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mock user data for UI building
  const user = { role: "manager", name: "Rahim Doe", email: "rahim@example.com" };
  const pendingReviews = 2;

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          isActive && "bg-secondary text-primary"
        )}
      >
        {children}
      </Link>
    );
  };
  
  const navItems = [
    { href: "/dashboard", icon: <Home className="h-4 w-4" />, label: "Dashboard" },
    { href: "/dashboard/meals", icon: <Utensils className="h-4 w-4" />, label: "Meals" },
    { href: "/dashboard/members", icon: <Users className="h-4 w-4" />, label: "Members" },
    { href: "/dashboard/settings", icon: <Settings className="h-4 w-4" />, label: "Settings" },
  ];

  const managerNavItems = [
    { href: "/dashboard/review", icon: <CheckSquare className="h-4 w-4" />, label: "Review", badge: pendingReviews },
  ];

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Logo />
              <span className="font-headline text-lg">MessX</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map(item => <NavLink key={item.href} href={item.href}>{item.icon}{item.label}</NavLink>)}
              {user.role === 'manager' && managerNavItems.map(item => (
                <NavLink key={item.href} href={item.href}>
                  {item.icon}{item.label}
                  {item.badge > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{item.badge}</Badge>}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Card>
              <CardContent className="p-2 md:p-4">
                <div className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary"/>
                    <div>
                        <p className="text-sm font-medium leading-none">Your Balance</p>
                        <p className="text-xl font-bold text-green-600">+৳500.00</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Logo/>
                  <span className="sr-only">MessX</span>
                </Link>
                {navItems.map(item => <NavLink key={item.href} href={item.href}>{item.icon}{item.label}</NavLink>)}
                 {user.role === 'manager' && managerNavItems.map(item => (
                    <NavLink key={item.href} href={item.href}>
                        {item.icon}{item.label}
                        {item.badge > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{item.badge}</Badge>}
                    </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
             <h1 className="font-headline text-xl">Dashboard</h1>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="@shadcn" data-ai-hint="man portrait"/>
                    <AvatarFallback>RD</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/login"><LogOut className="mr-2 h-4 w-4"/>Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
