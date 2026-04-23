import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, LogIn, Settings, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

export function ProfileButton() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/login") {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const initials = user?.email?.substring(0, 2).toUpperCase() || "U";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      {/* Theme Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:scale-110 transition-all border-primary/20"
        aria-label="Toggle dark mode"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-amber-500" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
      </Button>

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-14 w-14 rounded-full p-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
            >
              <Avatar className="h-14 w-14 border-2 border-primary">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl rounded-2xl">
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-primary/10" />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary focus:text-primary-foreground transition-colors p-3">
              <Link to="/profile" className="flex items-center w-full">
                <User className="mr-3 h-4 w-4" />
                <span>View Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary focus:text-primary-foreground transition-colors p-3">
              <Settings className="mr-3 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-primary/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="rounded-lg cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground transition-colors p-3"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          asChild
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary text-primary-foreground"
        >
          <Link to="/login">
            <LogIn className="h-6 w-6" />
          </Link>
        </Button>
      )}
    </div>
  );
}
