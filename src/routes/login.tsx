import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bus, Loader2, Mail, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate({ to: "/" });
    } catch (error: any) {
      toast.error(error.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0b]">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Bus className="text-primary-foreground w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TrackiGo</h1>
          <p className="text-muted-foreground mt-2">RouteRunner Management System</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
          <CardHeader className="space-y-1 pb-6 pt-8 text-center">
            <CardTitle className="text-2xl font-semibold text-white">Sign In</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Password
                  </Label>
                  <a href="#" className="text-xs text-primary hover:underline">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 group transition-all"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8 pt-2">
            <div className="relative w-full text-center py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5"></span>
              </div>
              <span className="relative bg-transparent px-2 text-[10px] uppercase tracking-widest text-white/40">
                Authorized Personnel Only
              </span>
            </div>
            <p className="text-center text-sm text-white/40">
              Don't have an account?{" "}
              <a href="#" className="text-primary font-medium hover:underline">
                Contact Admin
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
