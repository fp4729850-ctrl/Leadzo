import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const standalone = ("standalone" in navigator) && (navigator as { standalone?: boolean }).standalone;
    if (ios && !standalone) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm"
        >
          <div className="rounded-2xl border border-white/10 bg-[#0d0d16]/95 backdrop-blur-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                <Smartphone size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white">Install Leadzo AI</p>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                  {isIOS
                    ? 'Tap Share → "Add to Home Screen" for the full app experience'
                    : "Add to your home screen for a native app experience"}
                </p>
                {!isIOS && (
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="mt-3 h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 gap-1.5"
                  >
                    <Download size={12} />
                    Install App
                  </Button>
                )}
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 size-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
