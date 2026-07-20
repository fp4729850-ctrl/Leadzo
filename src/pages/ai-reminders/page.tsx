import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { supabase } from "@/lib/supabase.ts";
import { toast } from "sonner";
import { FileUp, Loader2, Save, Play, CheckCircle2 } from "lucide-react";

export default function AiRemindersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [scriptTemplate, setScriptTemplate] = useState("Hello {name}, your payment of {amount} is due on {due_date}. Please make the payment as soon as possible.");
  const [isSaving, setIsSaving] = useState(false);
  const [savedReminders, setSavedReminders] = useState<any[]>([]);

  useEffect(() => {
    fetchSavedReminders();
  }, []);

  const fetchSavedReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("call_reminders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSavedReminders(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleParse = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/aiReminders_parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            fileData: base64String,
            mimeType: file.type || "application/pdf"
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Parsing failed");

        setReminders(data.data);
        toast.success("File parsed successfully!");
      };
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (reminders.length === 0) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData = reminders.map(r => ({
        user_id: user.id,
        client_name: r.client_name,
        phone_number: r.phone_number,
        due_date: r.due_date,
        amount_or_context: r.amount_or_context,
        script_template: scriptTemplate,
        status: "pending"
      }));

      const { error } = await supabase.from("call_reminders").insert(insertData);
      if (error) throw error;

      toast.success("Reminders saved! System will call them automatically.");
      setReminders([]);
      setFile(null);
      fetchSavedReminders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Call Reminders</h1>
        <p className="text-muted-foreground mt-2">
          Upload a PDF or CSV file containing customer details. AI will extract names, numbers, and due dates to schedule automatic reminder calls.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-6 border border-border rounded-xl bg-card">
            <h2 className="font-semibold text-lg mb-4">1. Upload File</h2>
            <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
              <FileUp className={`size-10 mb-4 transition-colors ${file ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              <input type="file" id="file-upload" className="hidden" accept=".pdf,.csv,.xlsx" onChange={handleFileChange} />
              <label 
                htmlFor="file-upload" 
                className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  file 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {file ? "✓ Uploaded (Change File)" : "Choose File"}
              </label>
              <p className="text-sm mt-3">
                {file ? (
                  <span className="font-semibold text-foreground">{file.name}</span>
                ) : (
                  <span className="text-muted-foreground">Supported: PDF, CSV</span>
                )}
              </p>
            </div>
            <Button onClick={handleParse} disabled={!file || isParsing} className="w-full mt-4">
              {isParsing ? <><Loader2 className="animate-spin mr-2" size={16} /> Analyzing AI...</> : "Parse with Gemini AI"}
            </Button>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Example File Format (CSV/Excel/PDF):</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border bg-background text-left">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 border-b border-border">Client Name</th>
                      <th className="px-2 py-1.5 border-b border-border">Phone Number</th>
                      <th className="px-2 py-1.5 border-b border-border">Due Date</th>
                      <th className="px-2 py-1.5 border-b border-border">Amount / Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 border-b border-border">Rahul Sharma</td>
                      <td className="px-2 py-1 border-b border-border">+91 9876543210</td>
                      <td className="px-2 py-1 border-b border-border">2023-11-25</td>
                      <td className="px-2 py-1 border-b border-border">₹12,000 Premium</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1">Priya Patel</td>
                      <td className="px-2 py-1">+91 9123456789</td>
                      <td className="px-2 py-1">2023-11-26</td>
                      <td className="px-2 py-1">Car Loan EMI</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-2 leading-tight">
                * Note: AI is smart enough to extract data even if your columns have different names or if the details are just paragraphs inside a PDF.
              </p>
            </div>
          </div>

          <div className="p-6 border border-border rounded-xl bg-card">
            <h2 className="font-semibold text-lg mb-4">2. Customize AI Script</h2>
            
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Select Template Type</label>
              <select 
                className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'insurance') setScriptTemplate("Hello {name}, your insurance premium of {amount} is due on {due_date}. Please complete the payment to keep your policy active.");
                  else if (val === 'loan') setScriptTemplate("Hello {name}, your loan EMI of {amount} is scheduled for {due_date}. Please ensure your account has sufficient balance.");
                  else if (val === 'subscription') setScriptTemplate("Hi {name}, your subscription plan of {amount} expires on {due_date}. Renew it to enjoy uninterrupted services.");
                  else if (val === 'credit_card') setScriptTemplate("Hello {name}, your credit card bill of {amount} is due on {due_date}. Kindly pay on time to avoid late payment charges.");
                  else if (val === 'appointment') setScriptTemplate("Hello {name}, this is a gentle reminder regarding your upcoming {amount} scheduled for {due_date}. We look forward to serving you.");
                  else if (val === 'education') setScriptTemplate("Dear {name}, this is to remind you that the fee payment of {amount} must be cleared by {due_date}. Please complete it at the earliest.");
                  else if (val === 'real_estate') setScriptTemplate("Hello {name}, a gentle reminder that your rent or maintenance payment of {amount} is due by {due_date}. Please ensure timely payment.");
                  else if (val === 'custom') setScriptTemplate("");
                }}
                defaultValue="default"
              >
                <option value="default" disabled>-- Choose an option --</option>
                <option value="insurance">Insurance Premium Reminder</option>
                <option value="loan">Loan EMI Recovery</option>
                <option value="subscription">Subscription/Software Renewal</option>
                <option value="credit_card">Credit Card Bill Payment</option>
                <option value="appointment">Appointment/Booking Reminder</option>
                <option value="education">School/College Fee Reminder</option>
                <option value="real_estate">Real Estate/Rent Payment</option>
                <option value="custom">Custom (Write your own)</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              Available variables: <code className="bg-muted px-1 rounded">{"{name}"}</code>, <code className="bg-muted px-1 rounded">{"{amount}"}</code>, <code className="bg-muted px-1 rounded">{"{due_date}"}</code>
            </p>
            <textarea 
              className="w-full h-32 p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={scriptTemplate}
              onChange={(e) => setScriptTemplate(e.target.value)}
              placeholder="Write your AI prompt here..."
            />
          </div>
        </div>

        <div className="p-6 border border-border rounded-xl bg-card flex flex-col">
          <h2 className="font-semibold text-lg mb-4">3. Preview & Confirm</h2>
          <div className="flex-1 border border-border rounded-lg overflow-y-auto bg-background min-h-[300px]">
            {reminders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                Parsed data will appear here after AI extraction.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-left sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Phone</th>
                    <th className="px-4 py-2 font-medium">Due Date</th>
                    <th className="px-4 py-2 font-medium">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reminders.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">{r.client_name}</td>
                      <td className="px-4 py-3">{r.phone_number}</td>
                      <td className="px-4 py-3">{r.due_date}</td>
                      <td className="px-4 py-3">{r.amount_or_context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Button onClick={handleSave} disabled={reminders.length === 0 || isSaving} className="w-full mt-4 bg-chart-2 hover:bg-chart-2/90 text-white">
            {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
            Save & Schedule Calls
          </Button>
        </div>
      </div>

      <div className="p-6 border border-border rounded-xl bg-card">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="text-primary size-5" /> Active & Past Reminders
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg">
            <thead className="bg-muted text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Client</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium rounded-tr-lg">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {savedReminders.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No reminders found</td></tr>
              ) : (
                savedReminders.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.client_name}</td>
                    <td className="px-4 py-3">{r.phone_number}</td>
                    <td className="px-4 py-3">{r.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        r.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                        r.status === 'called' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
