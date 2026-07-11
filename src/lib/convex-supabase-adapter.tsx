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
    
    const isDelete = method.toLowerCase().includes('delete') || 
                     method.toLowerCase().includes('remove') || 
                     method === 'disconnectGsc';
                     
    const isUpdate = method.toLowerCase().includes('update') || 
                     method.toLowerCase().includes('toggle') || 
                     method === 'saveApiCredentials';

    const id = args.id || args._id || args.contactId || args.campaignId || args.analysisId;

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
        const { data, error } = await supabase.from(tableName).update(args).eq('id', user.id).select();
        if (error) throw error;
        return data?.[0] || null;
      }
      
      if (!id) {
        // Fallback to insert if update is called without ID
        const { data, error } = await supabase.from(tableName).insert([args]).select();
        if (error) throw error;
        return data?.[0] || null;
      }
      
      // Clean arguments before update
      const updateData = { ...args };
      delete updateData.id;
      delete updateData._id;
      
      const { data, error } = await supabase.from(tableName).update(updateData).eq('id', id).select();
      if (error) throw error;
      return data?.[0] || null;
    }
    
    // Default: Insert / Upsert
    const { data, error } = await supabase.from(tableName).upsert([args]).select();
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

export function Authenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  return !isAuthenticated ? <>{children}</> : null;
}

export function AuthLoading({ children }: { children: ReactNode }) {
  const { isLoading } = useAuthContext();
  return isLoading ? <>{children}</> : null;
}

export function useConvexAuth() {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
}
