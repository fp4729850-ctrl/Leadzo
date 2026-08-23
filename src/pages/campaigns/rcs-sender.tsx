import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { MessageSquareShare, Users, BookTemplate, Send, LayoutDashboard } from 'lucide-react';

export default function RcsSender() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>RCS Agents</CardTitle>
              <CardDescription>Register and manage your authorized RCS business senders.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Agent onboarding UI coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>RCS Contacts</CardTitle>
              <CardDescription>Upload CSVs and manage opt-in/opt-out status.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Contact management UI coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>RCS Templates</CardTitle>
              <CardDescription>Design Rich Cards, Carousels, and Suggested Replies.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Template composer coming soon.</p>
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
              <p className="text-sm text-muted-foreground">Campaign launcher coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
