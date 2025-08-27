import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get the current session token from Supabase with refresh
  let authHeader = {};
  try {
    const { supabase } = await import('./supabase');
    
    // First try to get the current session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }
    
    // If no session or expired token, try to refresh
    if (!session?.access_token) {
      console.log('No active session, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession?.access_token) {
        console.log('Failed to refresh session');
        throw new Error('No valid session available');
      }
      
      session = refreshedSession;
    }
    
    if (session?.access_token) {
      authHeader = { 'Authorization': `Bearer ${session.access_token}` };
      console.log('Auth token obtained successfully');
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Don't throw here, continue without auth header
  }

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeader,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the current session token from Supabase with refresh
    let authHeader = {};
    try {
      const { supabase } = await import('./supabase');
      
      // First try to get the current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      // If no session or expired token, try to refresh
      if (!session?.access_token) {
        console.log('No active session, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession?.access_token) {
          console.log('Failed to refresh session');
          throw new Error('No valid session available');
        }
        
        session = refreshedSession;
      }
      
      if (session?.access_token) {
        authHeader = { 'Authorization': `Bearer ${session.access_token}` };
        console.log('Auth token obtained successfully for query');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
      // Don't throw here, continue without auth header
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeader,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
