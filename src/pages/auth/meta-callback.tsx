import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase"; // adjust if needed
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function MetaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const error_description = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setErrorMsg(error_description || error);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code found in URL.");
      return;
    }

    const exchangeToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("Please log in to Leadzo first.");

        // Exchange code for token via edge function
        const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/meta_oauth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ code, userId: session.user.id })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to exchange token");
        }

        setStatus("success");
        toast.success("Successfully connected Meta Account! 🎉");
        
        // Redirect back to settings after 2 seconds
        setTimeout(() => {
          navigate("/settings");
        }, 2000);

      } catch (err: any) {
        console.error("OAuth Error:", err);
        setStatus("error");
        setErrorMsg(err.message);
      }
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background/50 backdrop-blur-md">
      <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <h2 className="text-xl font-bold">Connecting Meta Account...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we secure your access tokens.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="text-green-500" size={48} />
            <h2 className="text-xl font-bold">Connection Successful!</h2>
            <p className="text-sm text-muted-foreground">Your Instagram/WhatsApp is now linked to Leadzo.</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="text-red-500" size={48} />
            <h2 className="text-xl font-bold">Connection Failed</h2>
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button 
              onClick={() => navigate("/settings")}
              className="mt-4 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 text-sm font-medium"
            >
              Back to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
