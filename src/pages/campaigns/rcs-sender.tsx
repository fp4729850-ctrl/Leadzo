import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.tsx';
import { MessageSquareShare, Users, BookTemplate, Send, LayoutDashboard, Plus, Loader2, Upload, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase.ts';
import { useAuth } from '@/hooks/use-auth.ts';
import Papa from 'papaparse';

export default function RcsSender() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('agents');
  
  // State for Agents
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [newAgent, setNewAgent] = useState({ business_name: '', provider: 'google_rbm', brand_description: '', support_email: '', support_phone: '' });
  const [creatingAgent, setCreatingAgent] = useState(false);

  // State for Contacts
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '' });
  const [addingContact, setAddingContact] = useState(false);
  
  // CSV Import State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAgents();
      fetchContacts();
    }
  }, [user]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    const { data, error } = await supabase.from('rcs_agents').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (!error && data) setAgents(data);
    setLoadingAgents(false);
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    const { data, error } = await supabase.from('rcs_contacts').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(100);
    if (!error && data) setContacts(data);
    setLoadingContacts(false);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgent.business_name || !newAgent.support_email) return toast.error("Business name and email are required");
    
    setCreatingAgent(true);
    try {
      const { error } = await supabase.from('rcs_agents').insert({
        user_id: user?.id,
        business_name: newAgent.business_name,
        provider: newAgent.provider,
        brand_description: newAgent.brand_description,
        support_email: newAgent.support_email,
        support_phone: newAgent.support_phone,
        status: 'PENDING'
      });
      if (error) throw error;
      toast.success("RCS Agent Registration Submitted!");
      setNewAgent({ business_name: '', provider: 'google_rbm', brand_description: '', support_email: '', support_phone: '' });
      fetchAgents();
    } catch (err: any) {
      toast.error(err.message || "Failed to register agent");
    } finally {
      setCreatingAgent(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.phone_number) return toast.error("Phone number is required");
    
    setAddingContact(true);
    try {
      // Basic normalization
      let phone = newContact.phone_number.replace(/\D/g, '');
      if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
      if (!phone.startsWith('+')) phone = '+' + phone;

      const { error } = await supabase.from('rcs_contacts').insert({
        user_id: user?.id,
        name: newContact.name,
        phone_number: phone
      });
      if (error) throw error;
      toast.success("Contact Added!");
      setNewContact({ name: '', phone_number: '' });
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message || "Failed to add contact");
    } finally {
      setAddingContact(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        if (!results.data || results.data.length === 0) {
          toast.error("CSV file is empty or invalid format.");
          return;
        }

        setImportingCsv(true);
        setImportProgress(0);
        let successCount = 0;
        let errorCount = 0;
        
        // Ensure column mapping (some people use 'phone', 'Phone', 'phone_number', 'mobile')
        const dataRows = results.data as any[];
        const total = dataRows.length;
        
        // Supabase limits bulk insert to reasonable chunks, we will do batches of 500
        const batchSize = 500;
        const validContacts = [];

        for (const row of dataRows) {
          // Detect phone column
          let rawPhone = row.phone || row.Phone || row.phone_number || row.mobile || row.Mobile;
          let name = row.name || row.Name || row.first_name || '';

          if (rawPhone) {
             let phone = String(rawPhone).replace(/\D/g, '');
             if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
             if (!phone.startsWith('+')) phone = '+' + phone;
             
             validContacts.push({
               user_id: user?.id,
               name: name.trim(),
               phone_number: phone,
               is_opted_out: false
             });
          }
        }

        if (validContacts.length === 0) {
           toast.error("No valid phone numbers found. Ensure column header is 'phone'.");
           setImportingCsv(false);
           return;
        }

        try {
          // Batch insert
          for (let i = 0; i < validContacts.length; i += batchSize) {
            const batch = validContacts.slice(i, i + batchSize);
            const { error } = await supabase.from('rcs_contacts').upsert(batch, { onConflict: 'user_id, phone_number', ignoreDuplicates: true });
            
            if (error) {
              console.error("Batch error:", error);
              errorCount += batch.length;
            } else {
              successCount += batch.length;
            }
            
            setImportProgress(Math.round(((i + batchSize) / validContacts.length) * 100));
          }
          
          if (successCount > 0) {
             toast.success(`Successfully imported ${successCount} contacts!`);
             fetchContacts();
          }
          if (errorCount > 0) toast.error(`Failed to import ${errorCount} contacts.`);
          
        } catch(err: any) {
           toast.error(err.message || "Bulk import failed");
        } finally {
          setImportingCsv(false);
          setImportProgress(100);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquareShare className="h-8 w-8 text-primary" />
            Bulk RCS Business Messaging
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your verified RCS agents, contacts, templates, and launch rich media campaigns.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="agents" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <MessageSquareShare className="h-4 w-4 mr-2" /> RCS Agents
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Users className="h-4 w-4 mr-2" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BookTemplate className="h-4 w-4 mr-2" /> Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Send className="h-4 w-4 mr-2" /> Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>RCS Analytics</CardTitle>
              <CardDescription>Overview of your RCS messaging performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Dashboard metrics will appear here once campaigns are launched.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Plus size={18}/> Register RCS Agent</CardTitle>
                <CardDescription>Register a new business sender ID with Google RBM.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateAgent}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Business Name</Label>
                    <Input placeholder="e.g. Leadzo AI" value={newAgent.business_name} onChange={e => setNewAgent({...newAgent, business_name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Support Email</Label>
                    <Input type="email" placeholder="support@domain.com" value={newAgent.support_email} onChange={e => setNewAgent({...newAgent, support_email: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Support Phone (with Country Code)</Label>
                    <Input placeholder="+919876543210" value={newAgent.support_phone} onChange={e => setNewAgent({...newAgent, support_phone: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Brand Description</Label>
                    <Textarea placeholder="Short description of your business..." value={newAgent.brand_description} onChange={e => setNewAgent({...newAgent, brand_description: e.target.value})} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full gap-2" disabled={creatingAgent}>
                    {creatingAgent ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Submit for Verification
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><MessageSquareShare size={18}/> Registered Agents</CardTitle>
                <CardDescription>Your registered RCS senders and their approval status.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAgents ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : agents.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
                    No RCS agents found. Register your first business agent!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agents.map((agent: any) => (
                      <div key={agent.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-xl border border-border bg-background/50 gap-4">
                        <div>
                          <h3 className="font-bold text-foreground">{agent.business_name}</h3>
                          <p className="text-xs text-muted-foreground font-mono mt-1">{agent.id}</p>
                          <p className="text-sm text-muted-foreground mt-2">{agent.support_email} • {agent.provider}</p>
                        </div>
                        <div>
                          <Badge variant={agent.status === 'APPROVED' ? 'default' : agent.status === 'REJECTED' ? 'destructive' : 'secondary'} className={agent.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}>
                            {agent.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-6 md:col-span-1">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Plus size={18}/> Add Contact</CardTitle>
                </CardHeader>
                <form onSubmit={handleAddContact}>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Name (Optional)</Label>
                      <Input placeholder="John Doe" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input placeholder="+919876543210" value={newContact.phone_number} onChange={e => setNewContact({...newContact, phone_number: e.target.value})} required />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full gap-2" disabled={addingContact}>
                      {addingContact ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Add Contact
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Upload size={18}/> Import CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-background/50">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">Upload Contacts CSV</p>
                    <p className="text-xs text-muted-foreground mb-4">Required columns: name, phone</p>
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                    {importingCsv ? (
                      <div className="space-y-2">
                        <Progress value={importProgress} className="h-2 w-full" />
                        <p className="text-xs text-muted-foreground">{importProgress}% Imported...</p>
                      </div>
                    ) : (
                      <Button variant="secondary" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                        Select CSV File
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Users size={18}/> Audience List</CardTitle>
                <CardDescription>Your verified audience for RCS campaigns.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingContacts ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : contacts.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
                    No contacts found. Add manually or upload a CSV!
                  </div>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-background/80 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Phone Number</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Added On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {contacts.map((contact: any) => (
                          <tr key={contact.id} className="bg-background/20 hover:bg-background/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{contact.name || '-'}</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">{contact.phone_number}</td>
                            <td className="px-4 py-3">
                              {contact.is_opted_out ? (
                                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-none">Opted Out</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none">Active</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {new Date(contact.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>RCS Templates</CardTitle>
              <CardDescription>Design Rich Cards, Carousels, and Suggested Replies.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Template composer coming soon (Phase 3).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>RCS Campaigns</CardTitle>
              <CardDescription>Launch and track bulk RCS campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Campaign launcher coming soon (Phase 4).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
