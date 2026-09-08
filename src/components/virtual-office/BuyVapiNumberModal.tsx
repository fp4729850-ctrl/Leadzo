import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface BuyVapiNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (number: string) => void;
}

const AVAILABLE_REGIONS = [
  { areaCode: "864", region: "Greenville, SC (Available)", type: "Local" },
  { areaCode: "772", region: "Port St. Lucie, FL (Available)", type: "Local" },
  { areaCode: "928", region: "Yuma, AZ (Available)", type: "Local" },
  { areaCode: "415", region: "San Francisco, CA", type: "Local" },
  { areaCode: "212", region: "New York, NY", type: "Local" },
  { areaCode: "512", region: "Austin, TX", type: "Local" },
];

export function BuyVapiNumberModal({ isOpen, onClose, onSuccess }: BuyVapiNumberModalProps) {
  const [isBuying, setIsBuying] = useState<string | null>(null);

  const handleBuyNumber = async (areaCode: string) => {
    setIsBuying(areaCode);
    try {
      const { data, error } = await supabase.functions.invoke('vapi_phone_numbers', { 
        method: 'POST',
        body: { areaCode }
      });
      
      if (error) {
        let errorMessage = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
             const body = await error.context.json();
             if (body && body.error) errorMessage = body.error;
          }
        } catch(e) {}
        throw new Error(errorMessage);
      }
      
      if (data?.success && data?.number?.number) {
        toast.success(`Successfully purchased Vapi number: ${data.number.number}`, { duration: 8000 });
        if (onSuccess) onSuccess(data.number.number);
        onClose();
      } else {
        throw new Error(data?.error || "Failed to parse API response");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to purchase number", { duration: 8000 });
    } finally {
      setIsBuying(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-5 text-indigo-500" />
            Select a Virtual Number
          </DialogTitle>
          <DialogDescription>
            Choose a region to provision a new US phone number via Vapi AI. (Requires payment method in Vapi Dashboard)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {AVAILABLE_REGIONS.map((region) => (
            <div key={region.areaCode} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-indigo-500/50 hover:bg-indigo-50/50 transition-all">
              <div className="flex flex-col">
                <span className="font-semibold font-mono text-sm">
                  +1 ({region.areaCode}) ***-****
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {region.region}
                </span>
              </div>
              <Button 
                onClick={() => handleBuyNumber(region.areaCode)}
                disabled={isBuying !== null}
                size="sm"
                className={`w-24 ${isBuying === region.areaCode ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
              >
                {isBuying === region.areaCode ? "Buying..." : "Buy"}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
