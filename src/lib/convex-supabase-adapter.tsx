import { useQuery as useReactQuery, useMutation as useReactMutation } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { ReactNode } from 'react';
import { useAuthContext } from '@/components/providers/supabase-auth';

// Mapping camelCase Convex tables/namespaces to snake_case Postgres tables in Supabase
const TABLE_MAPPINGS: Record<string, string> = {
  // leads
  'leads': 'leads',
  'leads.list': 'leads',
  'leads.getMetrics': 'leads',
  
  // campaigns
  'campaigns': 'campaigns',
  'campaigns.list': 'campaigns',
  'campaigns.create': 'campaigns',
  'campaigns.remove': 'campaigns',
  
  // launchedCampaigns
  'launchedCampaigns': 'launched_campaigns',
  'launchedCampaigns.listLaunchedCampaigns': 'launched_campaigns',
  'launchedCampaigns.saveCampaign': 'launched_campaigns',
  'launchedCampaigns.deleteLaunchedCampaign': 'launched_campaigns',
  
  // learningAgent
  'learningAgent': 'learning_agent_data',
  'learningAgent.listLearnings': 'learning_agent_data',
  'learningAgent.listDailySummaries': 'learning_agent_data',
  'learningAgent.listSuggestions': 'learning_agent_data',
  
  // crm
  'crm': 'crm_contacts',
  'crm.listContacts': 'crm_contacts',
  'crm.createContact': 'crm_contacts',
  'crm.updateContact': 'crm_contacts',
  'crm.deleteContact': 'crm_contacts',
  'crm.listSequences': 'sequences',
  'crm.createSequence': 'sequences',
  'crm.toggleSequence': 'sequences',
  'crm.deleteSequence': 'sequences',
  'crm.listEnrollments': 'sequence_enrollments',
  'crm.enrollContact': 'sequence_enrollments',
  'crm.advanceEnrollment': 'sequence_enrollments',
  'crm.stopEnrollment': 'sequence_enrollments',
  
  // creatives
  'creatives': 'creatives',
  'creatives.listCreatives': 'creatives',
  'creatives.saveCreative': 'creatives',
  'creatives.deleteCreative': 'creatives',
  
  // marketIntelligence
  'marketIntelligence': 'market_analyses',
  'marketIntelligence.listAnalyses': 'market_analyses',
  'marketIntelligence.saveAnalysis': 'market_analyses',
  'marketIntelligence.deleteAnalysis': 'market_analyses',
  
  // messages
  'messages': 'messages',
  'messages.list': 'messages',
  'messages.send': 'messages',
  
  // adCampaigns
  'adCampaigns': 'ad_campaigns',
  'adCampaigns.list': 'ad_campaigns',
  
  // gsc
  'gsc': 'gsc_tokens',
  'gsc.getGscStatus': 'gsc_tokens',
  'gsc.disconnectGsc': 'gsc_tokens',
  
  // users
  'users': 'users',
  'users.getCurrentUser': 'users',
  'users.saveApiCredentials': 'users',
  'users.updateCurrentUser': 'users',
};

// Helper to aggregate and calculate leads metrics dynamically
function calculateLeadsMetrics(leads: any[]) {
  const total = leads.length;
  const converted = leads.filter((l: any) => l.status === 'Converted').length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  
  const totalScore = leads.reduce((sum: number, l: any) => sum + (Number(l.score) || 0), 0);
  const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
  
  const newLeads = leads.filter((l: any) => l.status === 'New').length;
  const urgent = leads.filter((l: any) => l.isUrgent || l.is_urgent).length;
  const scam = leads.filter((l: any) => l.isScam || l.is_scam).length;
  const spam = leads.filter((l: any) => l.status === 'Spam').length;
  
  // Platform map
  const platformMap: Record<string, number> = {
    whatsapp: 0,
    telegram: 0,
    instagram: 0,
    reddit: 0,
    x: 0,
    email: 0
  };
  // Intent map
  const intentMap: Record<string, number> = {
    BUY: 0,
    SELL: 0,
    NONE: 0
  };
  // Language map
  const languageMap: Record<string, number> = {
    hinglish: 0,
    english: 0,
    hindi: 0
  };
  
  leads.forEach((l: any) => {
    const p = String(l.platform || '').toLowerCase();
    if (p in platformMap) platformMap[p]++;
    else if (p) platformMap[p] = 1;
    
    const intent = String(l.intent || '').toUpperCase();
    if (intent in intentMap) intentMap[intent]++;
    
    const lang = String(l.language || '').toLowerCase();
    if (lang in languageMap) languageMap[lang]++;
  });
  
  // dailyLeads (last 7 days counts)
  const dailyLeads: { date: string, count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyLeads.push({ date: dateStr, count: 0 });
  }
  
  leads.forEach((l: any) => {
    const createdDate = new Date(l.created_at || l.createdAt || Date.now());
    const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayBucket = dailyLeads.find(d => d.date === dateStr);
    if (dayBucket) {
      dayBucket.count++;
    }
  });

  // statusFunnel
  const statuses = ['New', 'Contacted', 'Negotiating', 'Converted', 'Lost', 'Spam'];
  const statusFunnel = statuses.map(status => ({
    status,
    count: leads.filter((l: any) => l.status === status).length
  }));
  
  // scoreBuckets
  const ranges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
  const scoreBuckets = ranges.map(range => {
    const [min, max] = range.split('-').map(Number);
    const count = leads.filter((l: any) => {
      const score = Number(l.score) || 0;
      return score >= min && score <= max;
    }).length;
    return { range, count };
  });
  
  return {
    total,
    converted,
    conversionRate,
    avgScore,
    newLeads,
    urgent,
    scam,
    spam,
    platformMap,
    intentMap,
    languageMap,
    dailyLeads,
    statusFunnel,
    scoreBuckets
  };
}

// Adapter to mimic Convex useQuery
export function useQuery(apiEndpoint: any, args: any = {}): any {
  const queryStr = String(apiEndpoint).replace('api.', '');
  
  return useReactQuery({
    queryKey: [queryStr, args],
    queryFn: async () => {
      if (args === 'skip') return null;
      
      const parts = queryStr.split(':');
      const namespace = parts[0];
      const method = parts[1] || '';
      const mappingKey = method ? `${namespace}.${method}` : namespace;
      const tableName = TABLE_MAPPINGS[mappingKey] || TABLE_MAPPINGS[namespace] || namespace;
      
      let query = supabase.from(tableName).select('*');
      
      // Apply filters if query arguments are provided
      if (args && typeof args === 'object' && Object.keys(args).length > 0) {
        Object.entries(args).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            // map Convex _id to Postgres id
            const filterKey = key === '_id' ? 'id' : key;
            query = query.eq(filterKey, val);
          }
        });
      }
      
      const { data, error } = await query;
      if (error) {
        console.warn(`Supabase SELECT error for ${tableName}:`, error);
        return null;
      }
      
      if (queryStr === 'leads.getMetrics') {
        return calculateLeadsMetrics(data || []);
      }
      
      const isSingleObject = method.startsWith('get') || 
                             method.startsWith('check') || 
                             method.includes('Status') || 
                             method.includes('Metrics') || 
                             method === 'getCurrentUser';
                             
      if (isSingleObject) {
        // Return a single object or fallback values to prevent UI crashes
        if (!data || data.length === 0) {
          if (method.includes('Metrics')) {
            return {
              totalSpend: 0,
              totalRevenue: 0,
              roas: 0,
              cpl: 0,
              totalConversions: 0,
              totalImpressions: 0,
              totalClicks: 0,
              ctr: 0,
              dailyTrend: [],
              platformBreakdown: [],
              topCampaigns: []
            };
          }
          if (method.includes('Status')) {
            return { connected: false };
          }
          return null;
        }
        return data[0];
      }
      
      return data || [];
    }
  }).data;
}

// Adapter to mimic Convex useMutation
export function useMutation(apiEndpoint: any) {
  const queryStr = String(apiEndpoint).replace('api.', '');
  const parts = queryStr.split(':');
  const namespace = parts[0];
  const method = parts[1] || '';
  const mappingKey = method ? `${namespace}.${method}` : namespace;
  const tableName = TABLE_MAPPINGS[mappingKey] || TABLE_MAPPINGS[namespace] || namespace;
  
  return async (args: any = {}) => {
    if (!tableName) return null;

    // Handle CEO Dashboard metrics seeding logic
    if (mappingKey === 'adCampaigns.seedSampleData') {
      const { count } = await supabase.from('ad_campaigns').select('*', { count: 'exact', head: true });
      if (count && count > 0) return { status: 'skipped', reason: 'already seeded' };
      
      const sampleCampaigns = [
        { name: "Google Search - High Intent Leads", spend: 450, revenue: 1200, impressions: 12000, clicks: 450, conversions: 45, platform: "google", status: "active" },
        { name: "Facebook Retargeting - Add to Cart", spend: 320, revenue: 980, impressions: 24000, clicks: 800, conversions: 35, platform: "facebook", status: "active" },
        { name: "Instagram Video - Branding 2026", spend: 500, revenue: 1500, impressions: 38000, clicks: 1200, conversions: 60, platform: "instagram", status: "active" }
      ];
      const { data, error } = await supabase.from('ad_campaigns').insert(sampleCampaigns).select();
      if (error) throw error;
      return data;
    }
    
    const isDelete = method.toLowerCase().includes('delete') || 
                     method.toLowerCase().includes('remove') || 
                     method === 'disconnectGsc';
                     
    const isUpdate = method.toLowerCase().includes('update') || 
                     method.toLowerCase().includes('toggle') || 
                     method === 'saveApiCredentials';

    const id = args.id || args._id || args.contactId || args.campaignId || args.analysisId;

    // Clean undefined arguments and map them to null to prevent API failure
    const cleanArgs = { ...args };
    Object.keys(cleanArgs).forEach(key => {
      if (cleanArgs[key] === undefined) {
        cleanArgs[key] = null;
      }
    });

    if (isDelete) {
      if (!id) throw new Error(`DELETE operation on ${tableName} requires an ID.`);
      const { data, error } = await supabase.from(tableName).delete().eq('id', id).select();
      if (error) throw error;
      return data?.[0] || null;
    }
    
    if (isUpdate) {
      if (tableName === 'users' && !id) {
        // Update current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        
        // Clean ID params
        delete cleanArgs.id;
        delete cleanArgs._id;

        const { data, error } = await supabase.from(tableName).update(cleanArgs).eq('id', user.id).select();
        if (error) throw error;
        return data?.[0] || null;
      }
      
      if (!id) {
        // Fallback to insert if update is called without ID
        const { data, error } = await supabase.from(tableName).insert([cleanArgs]).select();
        if (error) throw error;
        return data?.[0] || null;
      }
      
      // Clean ID params before update
      delete cleanArgs.id;
      delete cleanArgs._id;
      
      const { data, error } = await supabase.from(tableName).update(cleanArgs).eq('id', id).select();
      if (error) throw error;
      return data?.[0] || null;
    }
    
    // Default: Insert / Upsert
    const { data, error } = await supabase.from(tableName).upsert([cleanArgs]).select();
    if (error) throw error;
    return data?.[0] || null;
  };
}

// Adapter to mimic Convex useAction (routing to Supabase Edge Functions)
export function useAction(apiEndpoint: any) {
  const queryStr = String(apiEndpoint).replace('api.', '');
  return async (args: any = {}) => {
    // Translate action naming like "creativeAi:generateCreatives" to Edge Function route
    const functionRoute = queryStr.replace(':', '_');
    const { data, error } = await supabase.functions.invoke(functionRoute, {
      body: args
    });
    if (error) {
      console.warn(`Supabase Edge Function invocation failed for ${functionRoute}:`, error);
      throw error;
    }
    return data;
  };
}

// Helper check to allow authentication bypass if default placeholder credentials are used
const hasRealSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && 
         import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

export function Authenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  if (!hasRealSupabaseConfigured()) return <>{children}</>;
  return isAuthenticated ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  if (!hasRealSupabaseConfigured()) return null;
  return !isAuthenticated ? <>{children}</> : null;
}

export function AuthLoading({ children }: { children: ReactNode }) {
  const { isLoading } = useAuthContext();
  if (!hasRealSupabaseConfigured()) return null;
  return isLoading ? <>{children}</> : null;
}

export function useConvexAuth() {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
}
