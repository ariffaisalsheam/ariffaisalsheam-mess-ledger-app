
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  LogOut,
  Menu,
  Settings,
  Users,
  Utensils,
  Wallet,
  CheckSquare,
  Bell,
  Loader2,
  Clock,
  ClipboardList,
  X,
  BookOpen,
  Receipt,
  CheckCheck,
  Moon,
  Sun,
  Download,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
    getUserProfile, 
    getMessById, 
    onMemberDetailsChange,
    onPendingItemsChange,
    ensureDailyMealDocs,
    onNotificationsChange,
    deleteNotification,
    deleteAllNotificationsForUser,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    type UserProfile, 
    type Member,
    type Notification
} from "@/services/messService";
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from "next-themes";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { InstallPwaNavButton } from "@/components/install-pwa-nav-button";

const NotificationHandler = dynamic(() => import('@/components/notification-handler'), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberDetails, setMemberDetails] = useState<Member | null>(null);
  const [messName, setMessName] = useState("Loading...");
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!auth) {
      router.push('/login');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authUser) return;

    let memberDetailsUnsubscribe: (() => void) | undefined;
    let pendingItemsUnsubscribe: (() => void) | undefined;
    let notificationsUnsubscribe: (() => void) | undefined;

    const setupListeners = async () => {
        try {
            const profile = await getUserProfile(authUser.uid);
            if (profile) {
                setUserProfile(profile);
                if (profile.messId) {
                    await ensureDailyMealDocs(profile.messId);

                    const mess = await getMessById(profile.messId);
                    setMessName(mess?.name as string || "No Mess");

                    memberDetailsUnsubscribe = onMemberDetailsChange(profile.messId, authUser.uid, setMemberDetails);
                    
                    if (profile.role) {
                         notificationsUnsubscribe = onNotificationsChange(profile.messId, authUser.uid, profile.role, setNotifications);
                    }

                    if (profile.role === 'manager') {
                        pendingItemsUnsubscribe = onPendingItemsChange(profile.messId, setPendingReviews);
                    }
                    setLoading(false);

                } else {
                    // Allow access to settings and install pages even without a mess
                    if (pathname !== '/dashboard/settings' && pathname !== '/dashboard/install') {
                        router.push('/welcome');
                    } else {
                        setMessName("No Mess");
                        setLoading(false);
                    }
                }
            } else {
                console.error("User profile not found in Firestore.");
                auth?.signOut();
                router.push('/login');
            }
        } catch (error) {
            console.error("Error setting up dashboard listeners:", error);
            setLoading(false);
        }
    };
    
    setupListeners();

    return () => {
      memberDetailsUnsubscribe?.();
      pendingItemsUnsubscribe?.();
      notificationsUnsubscribe?.();
    };
  }, [authUser, router, pathname]);
  
  useEffect(() => {
    let title: string;
    if (pathname === '/dashboard') {
      title = 'Dashboard';
    } else {
        const page = pathname.split('/').pop();
        switch(page) {
            case 'meals': title = 'Manage Your Meals'; break;
            case 'members': title = 'Mess Members'; break;
            case 'ledger': title = 'Meal Ledger'; break;
            case 'transactions': title = 'Transactions'; break;
            case 'reports': title = 'Monthly Reports'; break;
            case 'settings': title = 'Settings'; break;
            case 'review': title = 'Review Queue'; break;
            case 'install': title = 'Install App'; break;
            default: title = 'Dashboard';
        }
    }
    setPageTitle(title);
  }, [pathname]);

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      router.push('/login');
    }
  };

  const NavLink = ({ href, children, className }: { href: string; children: React.ReactNode, className?: string }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          isActive && "bg-primary/10 text-primary font-semibold",
          className
        )}
      >
        {children}
      </Link>
    );
  };
  
  const navItems = [
    { href: "/dashboard", icon: <Home className="h-5 w-5" />, label: "Dashboard" },
    { href: "/dashboard/meals", icon: <Utensils className="h-5 w-5" />, label: "Meals" },
    { href: "/dashboard/members", icon: <Users className="h-5 w-5" />, label: "Members" },
    { href: "/dashboard/ledger", icon: <BookOpen className="h-5 w-5" />, label: "Meal Ledger" },
    { href: "/dashboard/transactions", icon: <Receipt className="h-5 w-5" />, label: "Transactions" },
    { href: "/dashboard/reports", icon: <ClipboardList className="h-5 w-5" />, label: "Reports" },
  ];

  const managerNavItems = [
    { href: "/dashboard/review", icon: <CheckSquare className="h-5 w-5" />, label: "Review", badge: pendingReviews },
  ];
  
  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (userProfile?.messId) {
        await deleteNotification(userProfile.messId, notificationId);
    }
  };

  const handleClearAllNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userProfile?.messId && authUser?.uid && userProfile.role) {
        await deleteAllNotificationsForUser(userProfile.messId, authUser.uid, userProfile.role);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
     if (userProfile?.messId && authUser?.uid && userProfile.role) {
        await markAllNotificationsAsRead(userProfile.messId, authUser.uid, userProfile.role);
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (userProfile?.messId && !notification.read) {
        await markNotificationAsRead(userProfile.messId, notification.id);
    }
    if (notification.link) {
        router.push(notification.link);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const userBalance = memberDetails?.balance ?? 0;
  const userMeals = memberDetails?.meals ?? 0;
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Suspense fallback={null}>
        <NotificationHandler />
      </Suspense>
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Logo />
              <span className="font-headline text-lg">{messName}</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4">
              {navItems.map(item => <NavLink key={item.href} href={item.href}>{item.icon}{item.label}</NavLink>)}
              {userProfile?.role === 'manager' && managerNavItems.map(item => (
                <NavLink key={item.href} href={item.href}>
                  {item.icon}{item.label}
                  {item.badge > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">{item.badge}</Badge>}
                </NavLink>
              ))}
              <Separator className="my-2" />
              <InstallPwaNavButton />
              <NavLink href="/dashboard/settings"><Settings className="h-5 w-5" /> Settings</NavLink>
            </nav>
          </div>
          <div className="mt-auto p-4 space-y-4 border-t">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
                    <CardTitle className="text-sm font-medium">Your Total Meals</CardTitle>
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-bold">
                        {userMeals.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Your meals this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
                    <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className={`text-2xl font-bold ${userBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {userBalance >= 0 ? '+' : ''}৳{Math.abs(userBalance).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Your current account standing</p>
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
            <SheetContent side="left" className="flex flex-col p-0">
               <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <Logo />
                        <span className="font-headline text-lg">{messName}</span>
                    </Link>
                </div>
              <div className="flex-1 overflow-y-auto">
                <nav className="grid gap-2 p-4 text-lg font-medium">
                  {navItems.map(item => <NavLink key={item.href} href={item.href} className="py-3 text-base">{item.icon}{item.label}</NavLink>)}
                  {userProfile?.role === 'manager' && managerNavItems.map(item => (
                      <NavLink key={item.href} href={item.href} className="py-3 text-base">
                          {item.icon}{item.label}
                          {item.badge > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">{item.badge}</Badge>}
                      </NavLink>
                  ))}
                  <Separator className="my-2" />
                  <InstallPwaNavButton />
                  <NavLink href="/dashboard/settings" className="py-3 text-base"><Settings className="h-5 w-5" /> Settings</NavLink>
                </nav>
              </div>
              <div className="mt-auto p-4 space-y-4 border-t">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
                        <CardTitle className="text-sm font-medium">Your Total Meals</CardTitle>
                        <Utensils className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold">
                            {userMeals.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">Your meals this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
                        <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className={`text-2xl font-bold ${userBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {userBalance >= 0 ? '+' : ''}৳{Math.abs(userBalance).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">Your current account standing</p>
                    </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
             <h1 className="font-headline text-xl">{pageTitle}</h1>
          </div>
          <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 relative rounded-full">
                    <Bell className="h-4 w-4" />
                    {unreadNotificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-white">
                            {unreadNotificationCount}
                        </span>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b flex justify-between items-center">
                    <h3 className="font-medium font-headline text-sm">Notifications</h3>
                    <div className="flex items-center gap-2">
                        {unreadNotificationCount > 0 && (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAllRead}>
                                <CheckCheck className="mr-1 h-3 w-3"/>
                                Mark all as read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive hover:text-destructive/80" onClick={handleClearAllNotifications}>
                                Clear all
                            </Button>
                        )}
                    </div>
                </div>
                <ScrollArea className="h-96">
                    {notifications.length > 0 ? (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                className={cn(
                                    "relative group p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer",
                                    !n.read && "bg-primary/10"
                                )}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="pr-6">
                                    <p className="text-sm">{n.message}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        {n.timestamp ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                    </p>
                                </div>
                                {!n.read && <div className="absolute right-4 bottom-3 h-2 w-2 rounded-full bg-primary" />}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100"
                                    onClick={(e) => handleDeleteNotification(e, n.id)}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Delete notification</span>
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-8">No new notifications.</p>
                    )}
                </ScrollArea>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.photoURL ?? "https://placehold.co/40x40.png"} alt={userProfile?.displayName ?? "User"} data-ai-hint="man portrait"/>
                    <AvatarFallback>{userProfile?.displayName?.substring(0, 2).toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile?.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <InstallPwaButton />
              <DropdownMenuItem onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4"/>Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
