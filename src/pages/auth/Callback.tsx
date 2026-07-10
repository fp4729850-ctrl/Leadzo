import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase.ts";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/", { replace: true });
      } else {
        // Fallback if session isn't available immediately
        setTimeout(() => navigate("/", { replace: true }), 1500);
      }
    });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Verifying authentication...</p>
    </div>
  );
}
