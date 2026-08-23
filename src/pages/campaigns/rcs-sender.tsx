import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.tsx';
import { MessageSquareShare, Users, BookTemplate, Send, LayoutDashboard, Plus, Loader2, Upload, Search, CheckCircle2, Smartphone, Image as ImageIcon, PlusCircle, Trash2, Rocket } from 'lucide-react';
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

  // Template State
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'rich_card',
    content: {
      title: '',
      description: '',
      mediaUrl: '',
      suggestions: [] as any[]
    }
  });

  // Campaign State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [launchingCampaign, setLaunchingCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', template_id: '' });

  useEffect(() => {
    if (user) {
      fetchAgents();
      fetchContacts();
      fetchTemplates();
      fetchCampaigns();
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

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    const { data, error } = await supabase.from('rcs_templates').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (!error && data) setTemplates(data);
    setLoadingTemplates(false);
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const { data, error } = await supabase.from('rcs_campaigns').select('*, rcs_templates(name)').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (!error && data) setCampaigns(data);
    setLoadingCampaigns(false);
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.template_id) return toast.error("Please provide a name and select a template.");
    if (contacts.length === 0) return toast.error("No contacts available to send to.");
    if (agents.length === 0) return toast.error("No registered RCS Agent.");

    const selectedTemplate = templates.find(t => t.id === newCampaign.template_id);
    if (!selectedTemplate) return;

    setLaunchingCampaign(true);
    try {
      // Create campaign record
      const { data: campaignData, error } = await supabase.from('rcs_campaigns').insert({
        user_id: user?.id,
        agent_id: agents[0].id,
        name: newCampaign.name,
        message_type: selectedTemplate.type,
        content: selectedTemplate.content,
        total_contacts: contacts.length, // Sending to all active contacts for now
        status: 'PROCESSING'
      }).select().single();

      if (error) throw error;
      
      // We will trigger the background edge function here
      const { error: invokeError } = await supabase.functions.invoke('rcs_queue_campaign', {
        body: { campaign_id: campaignData.id }
      });

      if (invokeError) {
         console.error("Queue error:", invokeError);
         toast.error("Campaign created but queuing failed.");
      } else {
         toast.success("Campaign launched and queued in background!");
      }

      setNewCampaign({ name: '', template_id: '' });
      fetchCampaigns();
    } catch(err: any) {
      toast.error(err.message || "Failed to launch campaign.");
    } finally {
      setLaunchingCampaign(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.content.title) return toast.error("Template Name and Title are required");
    if (agents.length === 0) return toast.error("Please register an RCS Agent first.");
    
    setSavingTemplate(true);
    try {
      const { error } = await supabase.from('rcs_templates').insert({
        user_id: user?.id,
        agent_id: agents[0].id, // Using first agent for now
        name: newTemplate.name,
        type: newTemplate.type,
        content: newTemplate.content,
        status: 'APPROVED' // Auto-approve for demo purposes
      });
      if (error) throw error;
      toast.success("Template Saved!");
      setNewTemplate({
        name: '', type: 'rich_card', content: { title: '', description: '', mediaUrl: '', suggestions: [] }
      });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Template Builder Form */}
            <Card className="bg-card border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookTemplate size={18}/> Visual Template Composer</CardTitle>
                <CardDescription>Design Rich Cards and Suggested Replies for your campaign.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveTemplate}>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Template Name</Label>
                      <Input placeholder="e.g. Diwali Offer Card" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Message Type</Label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newTemplate.type}
                        onChange={e => setNewTemplate({...newTemplate, type: e.target.value})}
                      >
                        <option value="rich_card">Standalone Rich Card</option>
                        <option value="text">Text Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 border border-border p-4 rounded-xl bg-background/50">
                    <h3 className="font-semibold text-sm">Card Content</h3>
                    <div className="space-y-1.5">
                      <Label>Image URL (Optional)</Label>
                      <div className="flex gap-2">
                        <Input placeholder="https://example.com/image.jpg" value={newTemplate.content.mediaUrl} onChange={e => setNewTemplate({...newTemplate, content: {...newTemplate.content, mediaUrl: e.target.value}})} />
                        <Button type="button" variant="outline" size="icon"><ImageIcon size={16} /></Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Card Title</Label>
                      <Input placeholder="Card Title" value={newTemplate.content.title} onChange={e => setNewTemplate({...newTemplate, content: {...newTemplate.content, title: e.target.value}})} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Textarea placeholder="Description text..." rows={3} value={newTemplate.content.description} onChange={e => setNewTemplate({...newTemplate, content: {...newTemplate.content, description: e.target.value}})} />
                    </div>
                  </div>

                  <div className="space-y-4 border border-border p-4 rounded-xl bg-background/50">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Suggested Replies & Actions</h3>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary h-8"
                        onClick={() => setNewTemplate({...newTemplate, content: {...newTemplate.content, suggestions: [...newTemplate.content.suggestions, { text: 'New Button', postbackData: 'reply_1', actionUrl: '' }]}})}
                        disabled={newTemplate.content.suggestions.length >= 4}
                      >
                        <PlusCircle size={16} className="mr-1" /> Add Button
                      </Button>
                    </div>
                    
                    {newTemplate.content.suggestions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No buttons added yet. Max 4 allowed.</p>
                    ) : (
                      <div className="space-y-3">
                        {newTemplate.content.suggestions.map((sug: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-background p-2 rounded-lg border border-border">
                            <Input 
                              placeholder="Button Text" 
                              className="w-1/3 h-8" 
                              value={sug.text}
                              onChange={e => {
                                const newSugs = [...newTemplate.content.suggestions];
                                newSugs[idx].text = e.target.value;
                                setNewTemplate({...newTemplate, content: {...newTemplate.content, suggestions: newSugs}});
                              }}
                            />
                            <Input 
                              placeholder="URL (optional)" 
                              className="flex-1 h-8" 
                              value={sug.actionUrl}
                              onChange={e => {
                                const newSugs = [...newTemplate.content.suggestions];
                                newSugs[idx].actionUrl = e.target.value;
                                setNewTemplate({...newTemplate, content: {...newTemplate.content, suggestions: newSugs}});
                              }}
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                const newSugs = [...newTemplate.content.suggestions];
                                newSugs.splice(idx, 1);
                                setNewTemplate({...newTemplate, content: {...newTemplate.content, suggestions: newSugs}});
                            }}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full gap-2" disabled={savingTemplate}>
                    {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Save Template
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Right: Live Mobile Preview */}
            <Card className="bg-card border-border lg:col-span-1 h-fit sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Smartphone size={18}/> Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                {/* Simulated Android Phone Frame */}
                <div className="w-[300px] h-[600px] border-[8px] border-zinc-900 rounded-[2.5rem] bg-zinc-950 shadow-2xl relative overflow-hidden flex flex-col">
                  {/* Phone Header */}
                  <div className="h-16 bg-zinc-900 flex items-center px-4 gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                      <MessageSquareShare size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-zinc-100 font-semibold text-sm tracking-tight">{agents[0]?.business_name || 'Business Name'}</p>
                      <p className="text-emerald-400 text-[10px] flex items-center gap-1"><CheckCircle2 size={10} /> Verified</p>
                    </div>
                  </div>
                  
                  {/* Chat Area */}
                  <div className="flex-1 p-3 flex flex-col justify-end gap-2 bg-[#000000]">
                    {/* Rich Card Bubble */}
                    <div className="bg-zinc-900 rounded-2xl overflow-hidden self-start max-w-[90%] border border-zinc-800">
                      {newTemplate.content.mediaUrl && (
                        <div className="h-32 w-full bg-zinc-800 border-b border-zinc-800">
                          <img src={newTemplate.content.mediaUrl} alt="Media" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}
                      <div className="p-3">
                        {newTemplate.content.title ? (
                           <h4 className="font-bold text-zinc-100 text-sm leading-tight mb-1">{newTemplate.content.title}</h4>
                        ) : (
                           <h4 className="font-bold text-zinc-500 text-sm leading-tight mb-1">Card Title</h4>
                        )}
                        {newTemplate.content.description ? (
                           <p className="text-xs text-zinc-400 leading-relaxed">{newTemplate.content.description}</p>
                        ) : (
                           <p className="text-xs text-zinc-600 leading-relaxed">Description goes here...</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Suggested Replies / Actions (Chips) */}
                    {newTemplate.content.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {newTemplate.content.suggestions.map((sug: any, idx: number) => (
                          <div key={idx} className="bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 self-start shadow-sm">
                            <span className="text-zinc-200 text-xs font-medium">{sug.text || 'Button'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Input area */}
                  <div className="h-12 border-t border-zinc-800 bg-zinc-950 flex items-center px-4">
                    <div className="w-full h-8 bg-zinc-900 rounded-full flex items-center px-3">
                      <span className="text-zinc-600 text-xs">RCS message...</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Templates List */}
            <Card className="bg-card border-border lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">Saved Templates</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : templates.length === 0 ? (
                   <p className="text-center text-muted-foreground py-8">No templates saved yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {templates.map(t => (
                      <div key={t.id} className="border border-border rounded-xl p-4 bg-background/50 hover:bg-background transition-colors cursor-pointer relative group">
                        <Badge variant="secondary" className="absolute top-3 right-3">{t.status}</Badge>
                        <h4 className="font-semibold">{t.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{t.type.replace('_', ' ')}</p>
                        <div className="mt-4 pt-3 border-t border-border/50 text-xs truncate text-muted-foreground">
                          {t.content?.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card border-border lg:col-span-1 h-fit sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send size={18}/> Launch Campaign</CardTitle>
                <CardDescription>Blast your RCS template to all your active contacts.</CardDescription>
              </CardHeader>
              <form onSubmit={handleLaunchCampaign}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g. Diwali Flash Sale Blast" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Select Template</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newCampaign.template_id}
                      onChange={e => setNewCampaign({...newCampaign, template_id: e.target.value})}
                      required
                    >
                      <option value="" disabled>Select a template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-4 p-4 bg-background/50 border border-border rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Audience</span>
                      <span className="font-bold text-foreground">{contacts.filter(c => !c.is_opted_out).length} Contacts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Cost</span>
                      <span className="font-bold text-emerald-500">₹{(contacts.filter(c => !c.is_opted_out).length * 0.15).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full gap-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={launchingCampaign || templates.length === 0 || contacts.length === 0}>
                    {launchingCampaign ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                    Launch Broadcast
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="bg-card border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Campaign History</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCampaigns ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
                    No campaigns launched yet. Start your first broadcast!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map(camp => (
                      <div key={camp.id} className="border border-border rounded-xl p-4 bg-background/50 hover:bg-background transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-foreground text-lg">{camp.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Template: {camp.rcs_templates?.name || 'N/A'}</p>
                          </div>
                          <Badge className={camp.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'}>
                            {camp.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Audience</p>
                            <p className="font-semibold text-foreground">{camp.total_contacts}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Sent</p>
                            <p className="font-semibold text-foreground">{camp.sent_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                            <p className="font-semibold text-emerald-500">{camp.delivered_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Read (Blue Ticks)</p>
                            <p className="font-semibold text-blue-500">{camp.read_count}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
