import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function GscCallback() {
  const navigate = useNavigate();
  const exchangeCode = useAction(api.gscActions.exchangeGscCode);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    if (errorParam) {
      setError("Google access denied. Please try again.");
      setStatus("error");
      setTimeout(() => navigate("/seo-agent"), 3000);
      return;
    }

    if (!code) {
      setError("No authorization code received.");
      setStatus("error");
      setTimeout(() => navigate("/seo-agent"), 3000);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/gsc-callback`;
    exchangeCode({ code, redirectUri })
      .then((result) => {
        if (result.success) {
          setStatus("success");
          setTimeout(() => navigate("/seo-agent"), 2000);
        } else {
          setError(result.error ?? "Token exchange failed");
          setStatus("error");
          setTimeout(() => navigate("/seo-agent"), 3000);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
        setTimeout(() => navigate("/seo-agent"), 3000);
      });
  }, [exchangeCode, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin text-primary mx-auto" />
            <p className="text-foreground font-semibold">Connecting Google Search Console...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={40} className="text-chart-3 mx-auto" />
            <p className="text-foreground font-semibold">Google Search Console Connected!</p>
            <p className="text-muted-foreground text-sm">Redirecting to SEO Agent...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={40} className="text-destructive mx-auto" />
            <p className="text-foreground font-semibold">Connection Failed</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-muted-foreground text-xs">Redirecting back...</p>
          </>
        )}
      </div>
    </div>
  );
}
