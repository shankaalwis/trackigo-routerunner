import { useAuth } from "@/hooks/use-auth";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Mail, Calendar, Shield, User as UserIcon, LogOut } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#0a0a0b] text-white">
        <p className="text-xl mb-4 text-white/60">Please sign in to view your profile</p>
        <Button asChild className="rounded-xl">
          <Link to="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = user.email?.substring(0, 2).toUpperCase() || "U";
  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/5 rounded-xl"
          >
            <Link to="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-2xl mb-4">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-white">
                  {user.user_metadata?.full_name || "RouteRunner User"}
                </h2>
                <p className="text-sm text-white/40 mb-4">{user.email}</p>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold"
                >
                  Administrator
                </Badge>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-4 mb-2">
                Account Stats
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] uppercase text-white/30 mb-1">Turns Managed</p>
                  <p className="text-lg font-bold text-primary">124</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] uppercase text-white/30 mb-1">Last Active</p>
                  <p className="text-lg font-bold text-white">Today</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Account Information</CardTitle>
                <CardDescription className="text-white/40">
                  Manage your profile details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Full Name</p>
                      <p className="font-medium">
                        {user.user_metadata?.full_name || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center mr-4">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        Email Address
                      </p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mr-4">
                      <Calendar className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Joined On</p>
                      <p className="font-medium">{joinedDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center mr-4">
                      <Shield className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        Security Level
                      </p>
                      <p className="font-medium">Multi-Factor Authenticated</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl px-6 border-white/10 hover:bg-white/5 text-white"
                  >
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
