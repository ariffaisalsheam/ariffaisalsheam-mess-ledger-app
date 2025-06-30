
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { auth } from "@/lib/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User as FirebaseUser
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { upsertUser, getUserProfile } from "@/services/messService";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// NEW: Declare recaptchaVerifier in the window interface for TypeScript
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  // MODIFIED: State management consolidated
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  const [isForgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);


  // NEW: Setup reCAPTCHA verifier
  useEffect(() => {
    if (!auth) return;
    // This effect runs once to set up the invisible reCAPTCHA.
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        // This callback is primarily for 'visible' reCAPTCHA. With 'invisible',
        // the solving process is automatic.
      }
    });
    window.recaptchaVerifier = verifier;

    // Cleanup when component unmounts
    return () => {
        verifier.clear();
    };

  }, []);

  const handleSuccessfulLogin = async (user: FirebaseUser) => {
    await upsertUser(user);
    const profile = await getUserProfile(user.uid);
    if (profile?.messId) {
      router.push("/dashboard");
    } else {
      router.push("/welcome");
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return handleError("Firebase is not configured correctly.");
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleSuccessfulLogin(result.user);
    } catch (error: any) {
      handleError("Could not sign you in with Google. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return handleError("Firebase is not configured correctly.");
    if (!email || !password) return handleError("Please enter your email and password.");

    setLoading(true);
    setError(null);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user.emailVerified) {
            await auth.signOut();
            return handleError("Please verify your email before logging in. Check your inbox for a verification link.");
        }

        await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
        let description = "Could not sign you in. Please check your credentials and try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = "Invalid email or password. Please try again.";
        }
        handleError(description);
    } finally {
        setLoading(false);
    }
  }
  
  // NEW: Phone Authentication Step 1: Send verification code
  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !window.recaptchaVerifier) return handleError("Firebase is not configured correctly.");
    if (!phone) return handleError("Please enter your phone number with country code (e.g., +16505551234).");
    
    setLoading(true);
    setError(null);
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
        window.confirmationResult = confirmationResult;
        setShowCodeInput(true);
        toast({ title: "Code Sent!", description: "A verification code has been sent to your phone." });
    } catch (error: any) {
        console.error("Phone sign-in error:", error);
        handleError("Failed to send verification code. Please check the phone number and try again.");
    } finally {
        setLoading(false);
    }
  };
  
  // NEW: Phone Authentication Step 2: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirmationResult) return handleError("Verification process expired. Please request a new code.");
    if (!code) return handleError("Please enter the verification code.");
    
    setLoading(true);
    setError(null);
    try {
        const result = await window.confirmationResult.confirm(code);
        await handleSuccessfulLogin(result.user);
    } catch (error: any) {
        console.error("Code verification error:", error);
        handleError("Invalid code. Please try again.");
    } finally {
        setLoading(false);
    }
  }


  const handlePasswordReset = async () => {
    if (!auth) return handleError("Firebase is not configured correctly.");
    if (!resetEmail) return handleError("Please enter your email address.", "toast");
    
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ title: "Check your email", description: `A password reset link has been sent to ${resetEmail}.` });
        setForgotDialogOpen(false);
        setResetEmail("");
    } catch (error: any) {
        let description = "Failed to send password reset email. Please try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            description = "No user found with this email address.";
        }
        handleError(description, "toast");
    } finally {
        setIsResetting(false);
    }
  };
  
  // NEW: Centralized error handler
  const handleError = (message: string, type: 'alert' | 'toast' = 'alert') => {
      if (type === 'toast') {
          toast({ title: "Error", description: message, variant: "destructive" });
      } else {
          setError(message);
      }
  }

  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="mx-auto w-full max-w-sm border-0 shadow-lg md:border">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-headline">Mess Ledger</CardTitle>
            <CardDescription>Transparent Tracking, Effortless Settlement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 65.6l-58.3 52.7C338.6 97.2 297.9 80 248 80c-82.8 0-150.5 67.7-150.5 150.5S165.2 406.5 248 406.5c94.2 0 135.3-77.6 140.8-112.4H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                Continue with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
            </div>

            {/* MODIFIED: Tabbed interface for Email and Phone */}
            <Tabs defaultValue="email" className="w-full mt-4" onValueChange={() => setError(null)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="email">
                <form onSubmit={handleEmailSignIn} className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Button variant="link" type="button" onClick={() => setForgotDialogOpen(true)} className="ml-auto inline-block h-auto p-0 text-sm underline">
                        Forgot your password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className="pr-10" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword((prev) => !prev)} disabled={loading}>
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="phone">
                <div className="pt-4">
                  {!showCodeInput ? (
                    <form onSubmit={handlePhoneSignIn} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="phone-number">Phone Number</Label>
                        <Input id="phone-number" type="tel" placeholder="+1 650 555 1234" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Verification Code
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="verification-code">Verification Code</Label>
                        <Input id="verification-code" type="text" placeholder="123456" required value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify and Login
                      </Button>
                       <Button variant="link" onClick={() => setShowCodeInput(false)} className="w-full" disabled={loading}>
                        Back to phone number entry
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* NEW: Centralized error display */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 text-center text-sm text-muted-foreground">Don't have an account?</div>
            <Link href="/signup" passHref>
              <Button variant="outline" className="w-full mt-2">Get started</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* NEW: reCAPTCHA container, necessary for phone auth */}
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>

      {/* MODIFIED: Forgot Password Dialog */}
      <Dialog open={isForgotDialogOpen} onOpenChange={setForgotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter your email address and we'll send you a link to reset your password.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" placeholder="m@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordReset} disabled={isResetting}>
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
