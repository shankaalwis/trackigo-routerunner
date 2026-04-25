import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user && location.pathname !== "/login") {
      navigate({ to: "/login", replace: true });
    } else if (user && location.pathname === "/login") {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent rendering protected content while redirecting to login
  if (!user && location.pathname !== "/login") {
    return null;
  }

  // Prevent rendering login page while redirecting to home
  if (user && location.pathname === "/login") {
    return null;
  }

  return <>{children}</>;
}
