import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function GoogleAdsCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Google Ads se connect ho raha hai...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const userId = params.get("state"); // we pass userId as state

        if (error) {
          setStatus("error");
          setMessage("Access denied. Dobara try karein.");
          setTimeout(() => navigate("/campaign-launch"), 3000);
          return;
        }

        if (!code || !userId) {
          setStatus("error");
          setMessage("Invalid callback parameters.");
          setTimeout(() => navigate("/campaign-launch"), 3000);
          return;
        }

        setMessage("Tokens exchange ho rahe hain...");

        // Get Customer ID from localStorage if user entered it before
        const customerId = localStorage.getItem("google_ads_customer_id_pending") || "";

        const { data, error: fnErr } = await supabase.functions.invoke("googleAds_oauth", {
          body: { action: "exchange_code", code, userId, customerId }
        });

        if (fnErr || data?.error) {
          throw new Error(fnErr?.message || data?.error || "Token exchange failed");
        }

        // Clear pending customer ID
        localStorage.removeItem("google_ads_customer_id_pending");

        setStatus("success");
        setMessage("Google Ads successfully connect ho gaya!");
        toast.success("✅ Google Ads Connected!");

        setTimeout(() => navigate("/campaign-launch"), 2500);

      } catch (err: any) {
        console.error("Google Ads callback error:", err);
        setStatus("error");
        setMessage(err.message || "Connection failed. Dobara try karein.");
        toast.error("Google Ads connection failed");
        setTimeout(() => navigate("/campaign-launch"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 p-8 rounded-2xl border border-border bg-card max-w-sm w-full mx-4">
        {status === "loading" && (
          <>
            <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Loader2 size={28} className="text-red-500 animate-spin" />
            </div>
            <div>
              <p className="font-bold text-foreground">Google Ads Connect</p>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
          </>
        )}
        {status === "success" && (
          <>
            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-emerald-400">Connected!</p>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
              <p className="text-xs text-muted-foreground mt-2">Campaign Launch par redirect ho raha hai...</p>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <XCircle size={28} className="text-red-400" />
            </div>
            <div>
              <p className="font-bold text-red-400">Connection Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
              <p className="text-xs text-muted-foreground mt-2">Wapas ja rahe hain...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
