import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Link2, KeyRound, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";

const SYSTEM_APIS = [
  { id: "vapi", name: "Vapi Voice AI", status: "Connected", description: "Voice AI capabilities provided by Leadzo SaaS." },
  { id: "openai", name: "OpenAI GPT-4", status: "Connected", description: "Core LLM reasoning provided by Leadzo SaaS." },
  { id: "gemini", name: "Gemini Pro", status: "Connected", description: "Backup AI reasoning provided by Leadzo SaaS." },
];

const CUSTOM_APIS = [
  { id: "facebook", name: "Meta Ads API", description: "Connect your Facebook Ad account." },
  { id: "razorpay", name: "Razorpay API", description: "Connect your Razorpay account for revenue tracking." },
  { id: "google", name: "Google Search Console", description: "Connect GSC for SEO traffic data." },
  { id: "whatsapp", name: "WhatsApp Cloud API", description: "Connect WhatsApp for bulk messaging stats." },
  { id: "zendesk", name: "Zendesk API", description: "Connect your Zendesk for support tickets." },
];

export function ApiIntegrationsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const saveCredentials = useMutation(api.users.saveApiCredentials);
  
  const handleSave = async (id: string) => {
    if (!keys[id]) return;
    setSavingId(id);
    
    // Map custom api id to the camelCase column name for the adapter
    const columnMap: Record<string, string> = {
      facebook: "metaAdsApiKey",
      razorpay: "razorpayApiKey",
      google: "gscApiKey",
      whatsapp: "whatsappApiToken",
      zendesk: "zendeskApiKey"
    };

    try {
      await saveCredentials({ [columnMap[id]]: keys[id] });
      toast.success(`${id.toUpperCase()} API connected successfully!`);
    } catch (e) {
      toast.error(`Failed to connect ${id} API.`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="text-blue-500" />
            API Integrations
          </DialogTitle>
          <DialogDescription>
            Connect your company's accounts so your AI Manager can fetch your real-time data.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-8">
          {/* System APIs */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Platform APIs (Common)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SYSTEM_APIS.map(api => (
                <div key={api.id} className="p-4 border border-emerald-100 rounded-xl bg-emerald-50/30 flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-700">{api.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{api.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">
                    <CheckCircle2 size={12} />
                    {api.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom APIs */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Your Company Connections</h3>
            <div className="space-y-4">
              {CUSTOM_APIS.map(api => (
                <div key={api.id} className="p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{api.name}</h4>
                    <p className="text-sm text-slate-500">{api.description}</p>
                  </div>
                  <div className="flex-1 flex w-full gap-2">
                    <div className="relative flex-1">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="password" 
                        placeholder="Paste API Key here..."
                        value={keys[api.id] || ""}
                        onChange={(e) => setKeys(prev => ({ ...prev, [api.id]: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <button 
                      onClick={() => handleSave(api.id)}
                      disabled={!keys[api.id] || savingId === api.id}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingId === api.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
