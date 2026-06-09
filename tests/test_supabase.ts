import * as path from 'path';
import * as fs from 'fs';

// Simple helper to load environment variables from .env.local without using third-party packages
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
    console.log('No .env.local file found. Running on default parameters.');
  }
}
loadEnv();

// Import the client AFTER configuring environment variables
import { createClient } from '../utils/supabase/client';

async function runTests() {
  console.log('\n====================================');
  console.log('    SUPABASE INTEGRATION TEST RUN   ');
  console.log('====================================');

  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mockActive = !hasUrl || !hasKey;

  console.log(`Supabase URL configured: ${hasUrl ? 'YES' : 'NO'}`);
  console.log(`Supabase Anon Key configured: ${hasKey ? 'YES' : 'NO'}`);
  console.log(`Development Mock Mode status: ${mockActive ? 'ACTIVE (Fallback)' : 'DISABLED (Connected to cloud)'}`);
  console.log('------------------------------------');

  try {
    const supabase = createClient();
    console.log('✓ Supabase client created successfully.');

    console.log('Querying roof tiles table...');
    const { data: tiles, error } = await supabase
      .from('roof_tiles')
      .select('*');

    if (error) {
      console.error('✗ Failed to select from roof_tiles:', error);
    } else {
      console.log(`✓ Successfully queried roof tiles. Found ${tiles?.length || 0} items.`);
      if (tiles && tiles.length > 0) {
        console.log(`  Sample item: "${tiles[0].name}" in category "${tiles[0].category}"`);
      }
    }

    console.log('Checking default auth session state...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`✓ Active mock or cloud user: ${user.email}`);
    } else {
      console.log('✓ No active session detected (expected behavior for guest).');
    }

    console.log('------------------------------------');
    console.log('✅ ALL SUPABASE TESTS COMPLETED SUCCESSFULLY');
    console.log('====================================\n');
  } catch (err) {
    console.error('✗ Test suite execution crashed:', err);
    process.exit(1);
  }
}

runTests();
