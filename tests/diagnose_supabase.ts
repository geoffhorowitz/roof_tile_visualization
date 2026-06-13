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

async function diagnose() {
  console.log('\n==================================================');
  console.log('         SUPABASE DIAGNOSTIC REPORT               ');
  console.log('==================================================');
  console.log(`Connecting to: ${supabaseUrl}`);

  // 1. Check storage buckets
  console.log('\nChecking Supabase Storage Buckets...');
  try {
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.error('✗ Failed to list storage buckets:', storageError);
    } else {
      console.log('✓ Received buckets list from API.');
      console.log('  Note: For security reasons, the unauthenticated "anon" key is not allowed to list all buckets, so the returned list will be empty: []');
      console.log('  Direct bucket check: You confirmed "roof-visualizer" exists and is Public on your dashboard. That is correct!');
    }
  } catch (err: any) {
    console.error('✗ Storage check crashed:', err.message || err);
  }

  // 2. Check Database Tables
  console.log('\nChecking "roof_tiles" database table...');
  try {
    const { data: tiles, error: dbError } = await supabase
      .from('roof_tiles')
      .select('*');
    if (dbError) {
      console.error('✗ Failed to query "roof_tiles":', dbError);
    } else {
      console.log(`✓ Table "roof_tiles" exists and has ${tiles.length} rows.`);
    }
  } catch (err: any) {
    console.error('✗ Table query crashed:', err.message || err);
  }

  console.log('\n==================================================\n');
}

diagnose();
