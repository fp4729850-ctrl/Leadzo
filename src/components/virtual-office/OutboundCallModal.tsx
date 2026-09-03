import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PhoneForwarded, Loader2 } from "lucide-react";

interface OutboundCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "idle" | "loading" | "active" | "error";
}

export function OutboundCallModal({ isOpen, onClose, status }: OutboundCallModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white shadow-2xl overflow-hidden">
        <DialogHeader className="relative z-10 bg-slate-900/80 p-4 pb-2 backdrop-blur-md rounded-t-lg">
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Calling my Boss...
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {status === "loading" && "Connecting to physical network..."}
            {status === "active" && "Ringing your physical phone! Please answer."}
            {status === "error" && "Call failed to connect."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-square md:aspect-[4/3] bg-black overflow-hidden rounded-b-lg border-t border-slate-700">
          {/* Zoomed in Manager Video */}
          <video
            src="/virtual_office_bg_14s.mp4?v=1"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-[1.7] origin-[30%_50%] pointer-events-none select-none opacity-90"
          />
          
          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

          {/* Status Overlay */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-6 py-3 rounded-full flex items-center gap-3 shadow-xl">
              {status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="font-semibold text-sm">Initiating Call...</span>
                </>
              ) : status === "active" ? (
                <>
                  <PhoneForwarded className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span className="font-semibold text-sm">Manager is calling you!</span>
                </>
              ) : (
                <>
                  <PhoneForwarded className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-sm">Call Failed</span>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
