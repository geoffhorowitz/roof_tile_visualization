/**
 * Formats a Date object to the local 24-hour timestamp pattern: YYYY.M.D-H.mm.ss
 * Example: June 9, 2026 at 18:32:00 -> 2026.6.9-18.32.00
 */
export function formatLocalTimestamp(date: Date): string {
  const yyyy = date.getFullYear();
  const m = date.getMonth() + 1; // getMonth is 0-indexed
  const d = date.getDate();
  const h = date.getHours();
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}.${m}.${d}-${h}.${mm}.${ss}`;
}

/**
 * Extracts the image filename (without extension) from a local API proxy or Supabase URL
 * Example: "/api/image?filename=house_GAF%20Timberline%20HDZ_Barkwood_2026.6.9-18.32.00.png"
 *   -> "house_GAF Timberline HDZ_Barkwood_2026.6.9-18.32.00"
 */
export function getHistoryLabelFromUrl(url: string): string {
  if (!url) return '';
  try {
    let filename = '';
    if (url.includes('?filename=')) {
      const parts = url.split('?');
      const searchParams = new URLSearchParams(parts[1]);
      filename = searchParams.get('filename') || '';
    } else {
      filename = url.split('/').pop() || '';
    }
    
    const decoded = decodeURIComponent(filename);
    
    // Strip file extension
    return decoded.replace(/\.[^/.]+$/, '');
  } catch (err) {
    console.error('Failed to parse history label from URL:', err);
    // Simple fallback logic
    const lastPart = url.split('/').pop() || '';
    return decodeURIComponent(lastPart).replace(/\.[^/.]+$/, '');
  }
}
