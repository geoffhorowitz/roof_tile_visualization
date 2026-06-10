import { formatLocalTimestamp, getHistoryLabelFromUrl } from '../utils/historyUtils';

function runTests() {
  console.log('====================================');
  console.log('    TEST FILENAME UTILS RUNNING     ');
  console.log('====================================');

  // Test 1: Date formatting
  const testDate = new Date(2026, 5, 9, 18, 32, 0); // Month 5 is June
  const formatted = formatLocalTimestamp(testDate);
  const expectedFormat = '2026.6.9-18.32.00';
  if (formatted === expectedFormat) {
    console.log(`✓ Test 1 Passed: Date format is "${formatted}"`);
  } else {
    console.error(`✗ Test 1 Failed: Expected "${expectedFormat}", got "${formatted}"`);
    process.exit(1);
  }

  // Test 2: URL parsing with query params (local mock mode)
  const mockUrl = '/api/image?filename=house_GAF%20Timberline%20HDZ_Barkwood_2026.6.9-18.32.00.png';
  const labelFromMock = getHistoryLabelFromUrl(mockUrl);
  const expectedLabel = 'house_GAF Timberline HDZ_Barkwood_2026.6.9-18.32.00';
  if (labelFromMock === expectedLabel) {
    console.log(`✓ Test 2 Passed: Mock URL decoded to "${labelFromMock}"`);
  } else {
    console.error(`✗ Test 2 Failed: Expected "${expectedLabel}", got "${labelFromMock}"`);
    process.exit(1);
  }

  // Test 3: URL parsing with standard path (Supabase storage mode)
  const supabaseUrl = 'https://someproject.supabase.co/storage/v1/object/public/roof-visualizer/outputs/someuser/house_GAF%20Timberline%20HDZ_Barkwood_2026.6.9-18.32.00.png';
  const labelFromSupabase = getHistoryLabelFromUrl(supabaseUrl);
  if (labelFromSupabase === expectedLabel) {
    console.log(`✓ Test 3 Passed: Supabase URL decoded to "${labelFromSupabase}"`);
  } else {
    console.error(`✗ Test 3 Failed: Expected "${expectedLabel}", got "${labelFromSupabase}"`);
    process.exit(1);
  }

  console.log('====================================');
  console.log('✅ ALL FILENAME UTILS TESTS PASSED!');
  console.log('====================================');
}

runTests();
