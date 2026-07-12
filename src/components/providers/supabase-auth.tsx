import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Loader2 } from "lucide-react";

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signin: () => Promise<void>;
  signout: () => Promise<void>;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  isLoading: true,
  signin: async () => {},
  signout: async () => {},
  error: null,
});

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signin = async () => {
    setShowLoginModal(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please enter both email and password.");
    
    setIsLoggingIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        // Automatically try to sign up the user instead!
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        
        if (signUpError) {
           if (signUpError.message.includes("User already registered")) {
              toast.error("Wrong Password. Please try again.");
           } else {
              toast.error("Signup Error: " + signUpError.message);
           }
        } else {
           toast.success("Account created and logged in successfully!");
           setShowLoginModal(false);
           setEmail("");
           setPassword("");
        }
      } else {
        toast.error("Login Error: " + error.message);
      }
    } else {
      toast.success("Login Successful!");
      setShowLoginModal(false);
      setEmail("");
      setPassword("");
    }
    setIsLoggingIn(false);
  };

  const handleSignup = async () => {
    if (!email || !password) return toast.error("Please enter email and password for signup.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    
    setIsLoggingIn(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      toast.error("Signup Error: " + error.message);
    } else {
      if (data.session) {
         toast.success("Account created and logged in!");
         setShowLoginModal(false);
      } else {
         toast.success("Account created! Please check your email to verify your account before logging in.");
      }
    }
    setIsLoggingIn(false);
  };

  const signout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!session,
      user: session?.user ?? null,
      session,
      isLoading,
      signin,
      signout,
      error: null
    }}>
      {children}

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome to Leadzo AI</DialogTitle>
            <DialogDescription>
              Login or create a new account to continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (Min 6 chars)</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <DialogFooter className="pt-4 flex flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleSignup} disabled={isLoggingIn} className="flex-1 sm:flex-none">
                Sign Up
              </Button>
              <Button type="submit" disabled={isLoggingIn} className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90">
                {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Login
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
