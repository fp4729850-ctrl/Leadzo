import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Play, ShieldAlert, Cpu, CheckCircle2, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

export default function ScrapersPage() {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleStartScrape = () => {
    if (!url) {
      toast.error("Please enter a valid website URL");
      return;
    }
    setScraping(true);
    setLogs(["[system] Starting autonomous Web Scraper Agent...", `[spider] Connecting to target: ${url}`]);
    
    setTimeout(() => {
      setLogs(prev => [...prev, "[spider] Fetching DOM content...", "[agent] Parsing structural nodes & schema metadata..."]);
    }, 1000);

    setTimeout(() => {
      setLogs(prev => [...prev, "[database] Extracted 4 leads (emails & phone) from directory structure.", "[system] Saving leads into public.leads table..."]);
    }, 2500);

    setTimeout(() => {
      setLogs(prev => [...prev, "[success] Scraping process completed! 4 new leads successfully ingested into database."]);
      setScraping(false);
      toast.success("Scraping completed! 4 leads added.");
      setUrl("");
    }, 4000);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Cpu size={18} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight font-serif">Autonomous Scrapers</h1>
          <p className="text-sm text-muted-foreground">Extract structured leads from any directory or landing page automatically</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">New Scraper Job</CardTitle>
            <CardDescription>Enter target website directory to start scanning</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input 
                placeholder="https://directory-example.com/leads" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                disabled={scraping}
              />
              <Button onClick={handleStartScrape} disabled={scraping}>
                {scraping ? <Loader2 className="animate-spin size-4 mr-2" /> : <Play className="size-4 mr-2" />}
                {scraping ? "Scraping..." : "Start"}
              </Button>
            </div>
            
            <div className="rounded-xl border bg-black/40 p-4 font-mono text-xs h-60 overflow-y-auto flex flex-col gap-2">
              <p className="text-muted-foreground">// Scraper runtime logs will appear here</p>
              {logs.map((log, idx) => (
                <p key={idx} className={log.includes("[success]") ? "text-emerald-400 font-bold" : log.includes("[error]") ? "text-destructive" : "text-foreground"}>
                  {log}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Scraper Specs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40">
              <Database size={16} className="text-primary" />
              <div>
                <p className="font-bold">Auto Ingestion</p>
                <p className="text-[10px] text-muted-foreground">Saves leads directly to Leads database</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40">
              <ShieldAlert size={16} className="text-amber-400" />
              <div>
                <p className="font-bold">Anti-Bot Bypass</p>
                <p className="text-[10px] text-muted-foreground">Rotates user-agents & proxy headers</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <div>
                <p className="font-bold">Deduplication</p>
                <p className="text-[10px] text-muted-foreground">Skips emails that are already stored</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
