import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TILE_CATALOG } from '../../config/tileCatalog';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isMockMode = !supabaseUrl || !supabaseAnonKey;

// Server Mock Client to match API signature without connecting to Supabase
class ServerMockSupabaseClient {
  private cookieStore: any;
  
  constructor(cookieStore: any) {
    this.cookieStore = cookieStore;
  }

  auth = {
    getUser: async () => {
      const hasSession = this.cookieStore.get('sb-mock-session');
      if (hasSession) {
        return { data: { user: { id: 'mock-user-uuid', email: 'mockuser@example.com' } }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    getSession: async () => {
      const hasSession = this.cookieStore.get('sb-mock-session');
      if (hasSession) {
        return { data: { session: { user: { id: 'mock-user-uuid', email: 'mockuser@example.com' }, access_token: 'mock-token' } }, error: null };
      }
      return { data: { session: null }, error: null };
    }
  };

  from(table: string) {
    return {
      select: (query: string = '*') => {
        const execute = () => {
          if (table === 'roof_tiles') {
            return { data: TILE_CATALOG, error: null };
          }
          // Note: Generations are stored in localStorage client-side in mock mode.
          // Server-side returns empty array or we mock it.
          return { data: [], error: null };
        };

        const chain = {
          eq: (column: string, value: any) => {
            const data = execute().data.filter((item: any) => item[column] === value);
            return {
              order: (columnName: string, { ascending }: any = {}) => {
                return Promise.resolve({ data, error: null });
              },
              then: (onfulfilled: any) => {
                return Promise.resolve({ data, error: null }).then(onfulfilled);
              }
            };
          },
          order: (columnName: string, { ascending }: any = {}) => {
            return Promise.resolve(execute());
          },
          then: (onfulfilled: any) => {
            return Promise.resolve(execute()).then(onfulfilled);
          }
        };

        return chain as any;
      },
      insert: (rows: any | any[]) => {
        return Promise.resolve({ data: Array.isArray(rows) ? rows : [rows], error: null });
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
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
          return { data: { path: pathStr, fullPath: `${bucket}/${pathStr}` }, error: null };
        },
        getPublicUrl: (pathStr: string) => {
          return { data: { publicUrl: `/api/image?filename=${pathStr.split('/').pop()}` } };
        }
      };
    }
  };
}

export async function createClient() {
  const cookieStore = await cookies();

  if (isMockMode) {
    return new ServerMockSupabaseClient(cookieStore) as any;
  }

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
