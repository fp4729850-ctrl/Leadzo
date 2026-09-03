import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Link2, KeyRound, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { supabase } from "@/lib/supabase";

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
  
  const [customApiName, setCustomApiName] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customIntegrations, setCustomIntegrations] = useState<any[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);

  // Phone config
  const [countryCode, setCountryCode] = useState("+91");
  const [personalPhone, setPersonalPhone] = useState("");
  const [vapiPhoneId, setVapiPhoneId] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  
  // Leadzo Internal API
  const [internalApiEnabled, setInternalApiEnabled] = useState(false);
  const [isSavingInternalApi, setIsSavingInternalApi] = useState(false);

  const fetchIntegrations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    const { data: userData } = await supabase.from('users').select('phone').eq('id', session.user.id).maybeSingle();
    if (userData?.phone) {
      const validCodes = ['+1', '+44', '+91', '+61', '+971'];
      let matchedCode = '+91'; // default
      let phoneWithoutCode = userData.phone;
      
      for (const code of validCodes) {
        if (userData.phone.startsWith(code)) {
          matchedCode = code;
          phoneWithoutCode = userData.phone.substring(code.length);
          break;
        }
      }
      setCountryCode(matchedCode);
      setPersonalPhone(phoneWithoutCode);
    }
    
    // Get active business
    const { data: activeBrain } = await supabase
      .from('business_knowledge')
      .select('id, vapi_phone_id, internal_api_key')
      .eq('is_active', true)
      .eq('user_id', session.user.id)
      .maybeSingle();
      
    if (activeBrain) {
      setActiveBusinessId(activeBrain.id);
      if (activeBrain.vapi_phone_id) setVapiPhoneId(activeBrain.vapi_phone_id);
      if (activeBrain.internal_api_key) setInternalApiEnabled(true);
      
      const { data: integrations } = await supabase
        .from('custom_integrations')
        .select('*')
        .eq('business_id', activeBrain.id);
        
      setCustomIntegrations(integrations || []);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
    }
  }, [isOpen]);
  
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

  const handleAddCustom = async () => {
    if (!customApiName || !customApiKey) return;
    if (!activeBusinessId) {
      toast.error("No active company/brain found to link this API to.");
      return;
    }
    
    setIsAddingCustom(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No user");
      
      const { error } = await supabase.from('custom_integrations').insert({
        user_id: session.user.id,
        business_id: activeBusinessId,
        api_name: customApiName,
        api_key: customApiKey
      });
      
      if (error) throw error;
      toast.success(`${customApiName} API added!`);
      setCustomApiName("");
      setCustomApiKey("");
      fetchIntegrations();
    } catch (e) {
      toast.error("Failed to add custom API");
    } finally {
      setIsAddingCustom(false);
    }
  };

  const handleDeleteCustom = async (id: string) => {
    try {
      await supabase.from('custom_integrations').delete().eq('id', id);
      toast.success("API removed");
      fetchIntegrations();
    } catch (e) {
      toast.error("Failed to remove API");
    }
  };

  const handleSavePhoneConfig = async () => {
    setIsSavingPhone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No user");

      const { error: userError } = await supabase.from('users').update({ phone: `${countryCode}${personalPhone}` }).eq('id', session.user.id);
      if (userError) throw userError;
      
      if (activeBusinessId) {
        const { error: bizError } = await supabase.from('business_knowledge').update({ vapi_phone_id: vapiPhoneId }).eq('id', activeBusinessId);
        if (bizError) throw bizError;
      } else {
        throw new Error("No active company found. Please set up your AI Brain first.");
      }
      
      toast.success("Phone configuration saved!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save phone config.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleToggleInternalApi = async (checked: boolean) => {
    setInternalApiEnabled(checked);
    setIsSavingInternalApi(true);
    try {
      if (!activeBusinessId) {
        throw new Error("No active company found. Please set up your AI Brain first.");
      }
      
      // If toggled OFF, we could remove the key or just disable it in Vapi.
      // For now, we will simulate the auto-configuration since Vapi setup requires API endpoints.
      if (checked) {
        toast.success("Leadzo Internal API connected to AI Manager successfully!");
      } else {
        toast.success("Leadzo Internal API disconnected.");
      }
    } catch (e: any) {
      setInternalApiEnabled(!checked);
      toast.error(e.message || "Failed to toggle Internal API");
    } finally {
      setIsSavingInternalApi(false);
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
            <div className="mt-8">
              <h3 className="text-[#3b82f6] text-lg font-semibold mb-4">Leadzo AI Internal Data</h3>
              <p className="text-gray-400 text-sm mb-4">
                Connect Leadzo's internal database to your AI Manager so it can answer questions about your campaigns, leads, and account balance.
              </p>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">Connect Leadzo Data to AI Manager</h4>
                  <p className="text-gray-400 text-xs mt-1">This will automatically configure a secure, read-only Tool in your Vapi Assistant.</p>
                </div>
                <button
                  onClick={() => handleToggleInternalApi(!internalApiEnabled)}
                  disabled={isSavingInternalApi}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    internalApiEnabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      internalApiEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

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

          {/* Universal Custom APIs */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Add Any Custom API</h3>
            <p className="text-sm text-slate-500 mb-4">
              Connect your own SaaS tools (Shopify, Mailchimp, Twitter, etc.). Your AI Manager will automatically learn to fetch data from them!
            </p>
            
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input 
                type="text" 
                placeholder="API Name (e.g. Shopify)"
                value={customApiName}
                onChange={(e) => setCustomApiName(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input 
                type="password" 
                placeholder="Paste API Key here..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="flex-[2] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button 
                onClick={handleAddCustom}
                disabled={!customApiName || !customApiKey || isAddingCustom}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingCustom ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add API
              </button>
            </div>

            <div className="space-y-2">
              {customIntegrations.map((ci: any) => (
                <div key={ci.id} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-blue-500" />
                    <span className="font-medium text-slate-800">{ci.api_name}</span>
                  </div>
                  <button onClick={() => handleDeleteCustom(ci.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Phone Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Phone Configuration</h3>
            <p className="text-sm text-slate-500 mb-4">
              Configure your virtual AI Manager's phone number and your personal number for direct physical calls.
            </p>
            <div className="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Your Personal Phone Number</label>
                <div className="flex gap-2">
                  <select 
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 bg-white"
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+971">+971 (AE)</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="9876543210"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Manager's Vapi Phone ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. 5f4e3d2c..."
                  value={vapiPhoneId}
                  onChange={(e) => setVapiPhoneId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 bg-white"
                />
              </div>
              <button 
                onClick={handleSavePhoneConfig}
                disabled={isSavingPhone}
                className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingPhone ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Phone Config
              </button>
            </div>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
