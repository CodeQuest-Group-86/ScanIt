/**
 * services/barcodeCache.ts
 *
 * Offline-first barcode lookup cache. Every successful barcode scan (backend or Open Food
 * Facts, whichever the backend used) gets cached locally by its barcode. When the backend
 * is unreachable, a barcode the user has already scanned before -- on this device, by them
 * or a previous session -- resolves instantly from cache instead of failing outright.
 *
 * This is intentionally NOT pre-seeded with a fabricated product database -- that would mean
 * inventing barcode-to-product mappings I can't verify, which is worse than no offline
 * support at all. It grows from real, previously-successful lookups only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanResult } from '@/types';

const CACHE_KEY = 'scanit_barcode_cache';
const MAX_ENTRIES = 500;

interface CacheEntry {
  result: ScanResult;
  cachedAt: number;
}

type Cache = Record<string, CacheEntry>;

async function readCache(): Promise<Cache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeCache(cache: Cache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — caching is a nice-to-have, never block on it.
  }
}

export async function getCachedBarcode(barcode: string): Promise<ScanResult | null> {
  const cache = await readCache();
  return cache[barcode]?.result ?? null;
}

export async function cacheBarcodeResult(barcode: string, result: ScanResult): Promise<void> {
  const cache = await readCache();
  cache[barcode] = { result, cachedAt: Date.now() };

  const entries = Object.entries(cache);
  if (entries.length > MAX_ENTRIES) {
    // Evict oldest first — keep the cache bounded so it can't grow forever.
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toKeep = entries.slice(entries.length - MAX_ENTRIES);
    await writeCache(Object.fromEntries(toKeep));
  } else {
    await writeCache(cache);
  }
}
