import { useQuery as useReactQuery, useMutation as useReactMutation } from '@tanstack/react-query';
import { supabase } from './supabase.ts';
import { ReactNode } from 'react';
import { useAuthContext } from '@/components/providers/supabase-auth.tsx';

// Adapter to mimic Convex useQuery
export function useQuery(apiEndpoint: any, args: any = {}) {
  const queryStr = String(apiEndpoint);
  return useReactQuery({
    queryKey: [queryStr, args],
    queryFn: async () => {
      // Very basic table inference from endpoint name (e.g. "leads:list" -> "leads")
      const tableName = queryStr.split(':')[0];
      if (!tableName) return null;
      
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.warn('Supabase query error for', tableName, error);
        return [];
      }
      return data;
    }
  }).data;
}

// Adapter to mimic Convex useMutation
export function useMutation(apiEndpoint: any) {
  const queryStr = String(apiEndpoint);
  const tableName = queryStr.split(':')[0];
  
  return async (args: any) => {
    if (!tableName) return null;
    const { data, error } = await supabase.from(tableName).insert([args]).select();
    if (error) throw error;
    return data?.[0];
  };
}

// Adapter to mimic Convex useAction
export function useAction(apiEndpoint: any) {
  const queryStr = String(apiEndpoint);
  return async (args: any) => {
    // Simulate edge function call
    const { data, error } = await supabase.functions.invoke(queryStr.replace(':', '_'), {
      body: args
    });
    if (error) {
      console.warn('Edge function error', queryStr, error);
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
