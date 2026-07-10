import { useState } from "react";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type GenerateFn = (args: { type: string; prompt: string; language: string; tone: string; count: number }) => Promise<unknown>;

type TemplateGeneratorProps = { campaignType: string; onSelect: (template: string) => void; generateFn: GenerateFn; };

function TemplateGenerator(props: TemplateGeneratorProps) {
  const { campaignType, onSelect, generateFn } = props;
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [tone, setTone] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Campaign goal likhna zaroori hai"); return; }
    setLoading(true); setTemplates([]);
    try {
      const result = await generateFn({ type: campaignType, prompt, language, tone, count: 3 });
      const parsed = result as string[];
      setTemplates(Array.isArray(parsed) ? parsed : []);
    } catch { toast.error("Template generation failed. Check your HERCULES_API_KEY secret."); }
    finally { setLoading(false); }
  };

  const handleCopy = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
    toast.success("Copied!");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Campaign Goal</Label>
        <Textarea placeholder="e.g. 10k USDT buyers ko target karo" className="resize-none text-sm" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label>Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hinglish">Hinglish</SelectItem>
              <SelectItem value="hindi">Hindi</SelectItem>
              <SelectItem value="english">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={loading} size="sm" className="w-full cursor-pointer gap-2">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {loading ? "Generating..." : "Generate 3 AI Templates"}
      </Button>
      {templates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Generated Templates</p>
          {templates.map((t, i) => (
            <div key={i} onClick={() => onSelect(t)} className={cn("relative rounded-lg border border-border bg-muted/40 p-3 cursor-pointer hover:border-primary/40 transition-colors group")}>
              <p className="whitespace-pre-wrap text-xs leading-relaxed pr-8">{t}</p>
              <button onClick={(e) => { e.stopPropagation(); handleCopy(t, i); }} className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">
                {copied === i ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <p className="text-[9px] text-primary mt-1.5 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Click to use →</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplateGenerator;
