import * as path from 'path';
import * as fs from 'fs';

// Mock WebSocket class to bypass Node 20 check in @supabase/realtime-js
(global as any).WebSocket = class {};

import { createBrowserClient } from '@supabase/ssr';

// Load .env.local configurations manually
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    });
    console.log('Loaded configurations from .env.local');
  } else {
    console.error('Error: No .env.local file found.');
    process.exit(1);
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env.local');
  process.exit(1);
}

const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
  console.log('\n==================================================');
  console.log('         PROFILES TABLE DUMP & COUNT              ');
  console.log('==================================================');

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('✗ Failed to query profiles table:', error);
    } else {
      console.log(`✓ Successfully queried public.profiles.`);
      console.log(`Total profiles found: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        console.log('Profiles list:');
        console.log(JSON.stringify(profiles, null, 2));
      } else {
        console.log('⚠️ WARNING: The profiles table is completely empty!');
        console.log('If you signed up for an account BEFORE running the SQL schema script, your profile was not created.');
      }
    }
  } catch (err: any) {
    console.error('✗ Query crashed:', err.message || err);
  }

  console.log('\n==================================================\n');
}

checkProfiles();
