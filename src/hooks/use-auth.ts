import { useAuthContext } from "@/components/providers/supabase-auth.tsx";
export { useAuthContext as useAuth };
export const useUser = () => {
  const auth = useAuthContext();
  return { user: auth.user, isLoading: auth.isLoading };
};
