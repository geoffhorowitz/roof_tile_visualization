import { createBrowserClient } from '@supabase/ssr';
import { TILE_CATALOG } from '../../config/tileCatalog';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mock client for local development when Supabase configuration is missing
class MockSupabaseClient {
  auth = {
    signUp: async ({ email, password, options }: any) => {
      console.warn("Supabase Mock Mode: Registering user", email);
      const mockUser = { id: 'mock-user-uuid', email, user_metadata: options?.data || {} };
      const session = { access_token: 'mock-token', user: mockUser };
      localStorage.setItem('mock_session', JSON.stringify(session));
      document.cookie = "sb-mock-session=true; path=/; max-age=3600; SameSite=Lax";
      return { data: { user: mockUser, session }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      console.warn("Supabase Mock Mode: Signing in user", email);
      const mockUser = { id: 'mock-user-uuid', email };
      const session = { access_token: 'mock-token', user: mockUser };
      localStorage.setItem('mock_session', JSON.stringify(session));
      document.cookie = "sb-mock-session=true; path=/; max-age=3600; SameSite=Lax";
      return { data: { user: mockUser, session }, error: null };
    },
    signOut: async () => {
      console.warn("Supabase Mock Mode: Signing out");
      localStorage.removeItem('mock_session');
      document.cookie = "sb-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      return { error: null };
    },
    getSession: async () => {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const sessionStr = localStorage.getItem('mock_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      return { data: { session }, error: null };
    },
    getUser: async () => {
      if (typeof window === 'undefined') return { data: { user: null }, error: null };
      const sessionStr = localStorage.getItem('mock_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      return { data: { user: session ? session.user : null }, error: null };
    }
  };

  from(table: string) {
    const getMockGenerations = () => {
      if (typeof window === 'undefined') return [];
      const itemsStr = localStorage.getItem('mock_generations');
      return itemsStr ? JSON.parse(itemsStr) : [];
    };

    return {
      select: (query: string = '*') => {
        const execute = () => {
          if (table === 'roof_tiles') {
            return { data: TILE_CATALOG, error: null };
          }
          if (table === 'generations') {
            return { data: getMockGenerations(), error: null };
          }
          return { data: [], error: null };
        };

        const chain = {
          eq: (column: string, value: any) => {
            const data = execute().data.filter((item: any) => item[column] === value);
            return {
              order: (columnName: string, { ascending }: any = {}) => {
                const sorted = [...data].sort((a: any, b: any) => {
                  const diff = new Date(a[columnName]).getTime() - new Date(b[columnName]).getTime();
                  return ascending ? diff : -diff;
                });
                return Promise.resolve({ data: sorted, error: null });
              },
              then: (onfulfilled: any) => {
                return Promise.resolve({ data, error: null }).then(onfulfilled);
              }
            };
          },
          order: (columnName: string, { ascending }: any = {}) => {
            const sorted = [...execute().data].sort((a: any, b: any) => {
              const diff = new Date(a[columnName]).getTime() - new Date(b[columnName]).getTime();
              return ascending ? diff : -diff;
            });
            return Promise.resolve({ data: sorted, error: null });
          },
          then: (onfulfilled: any) => {
            return Promise.resolve(execute()).then(onfulfilled);
          }
        };

        return chain as any;
      },
      insert: (rows: any | any[]) => {
        const rowArray = Array.isArray(rows) ? rows : [rows];
        if (table === 'generations') {
          const current = getMockGenerations();
          const newRows = rowArray.map(r => ({
            id: r.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...r
          }));
          localStorage.setItem('mock_generations', JSON.stringify([...current, ...newRows]));
          return Promise.resolve({ data: newRows, error: null });
        }
        return Promise.resolve({ data: rowArray, error: null });
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            if (table === 'generations' && column === 'id') {
              const current = getMockGenerations();
              const filtered = current.filter((g: any) => g.id !== value);
              localStorage.setItem('mock_generations', JSON.stringify(filtered));
            }
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    };
  }

  storage = {
    from: (bucket: string) => {
      return {
        upload: async (pathStr: string, file: any, options?: any) => {
          console.warn(`Supabase Mock Mode: Uploading file to ${bucket}/${pathStr}`);
          return { data: { path: pathStr, fullPath: `${bucket}/${pathStr}` }, error: null };
        },
        getPublicUrl: (pathStr: string) => {
          return { data: { publicUrl: `/api/image?filename=${pathStr.split('/').pop()}` } };
        }
      };
    }
  };
}

export const isMockMode = !supabaseUrl || !supabaseAnonKey;

export function createClient() {
  if (isMockMode) {
    if (typeof window !== 'undefined') {
      // Create a global instance so it's shared across components
      if (!(window as any).__mockSupabaseClient) {
        (window as any).__mockSupabaseClient = new MockSupabaseClient();
      }
      return (window as any).__mockSupabaseClient;
    }
    return new MockSupabaseClient();
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
