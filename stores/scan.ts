import { paymentService } from '@/services/payment';
import { scanService } from '@/services/scan';
import type { AIAnalysisResult, ScanResult } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/** Cycles `analyzingStage` through a few lines of copy while a scan is in flight, so a
 *  longer wait (e.g. a cold backend falling back to on-device AI) still feels alive
 *  instead of stuck on one static message. Returns a cleanup to cancel pending stages. */
function scheduleStages(
  stages: string[],
  intervalMs: number,
  set: (partial: Partial<ScanState>) => void,
): () => void {
  const timers = stages.slice(1).map((text, i) =>
    setTimeout(() => set({ analyzingStage: text }), intervalMs * (i + 1)),
  );
  return () => timers.forEach(clearTimeout);
}

const ANALYZE_STAGES = [
  'Analyzing your photo…',
  'Identifying the product…',
  'Finding the best prices…',
  'Almost there…',
];
const BARCODE_STAGES = [
  'Looking up barcode…',
  'Fetching product details…',
  'Almost done…',
];

const MAX_HISTORY = 50;
const HISTORY_KEY = 'scanit_scan_history';
const QUOTA_KEY = 'scanit_scan_quota';
const FREE_SCANS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Quota helpers ──────────────────────────────────────────────────────────
// This is just a fast local check for UX — the backend enforces the real limit
// server-side (ScanService.enforceQuota), since this is trivially bypassed by
// clearing app storage.

interface QuotaRecord {
  totalScans: number;
  isPremium: boolean;
  periodStart: number; // epoch ms — start of the current free-tier daily window
}

async function loadQuota(): Promise<QuotaRecord> {
  try {
    const raw = await AsyncStorage.getItem(QUOTA_KEY);
    if (raw) {
      const q: QuotaRecord = JSON.parse(raw);
      if (Date.now() - (q.periodStart ?? 0) > DAY_MS) {
        return { totalScans: 0, isPremium: q.isPremium, periodStart: Date.now() };
      }
      return q;
    }
  } catch { /* ignore */ }
  return { totalScans: 0, isPremium: false, periodStart: Date.now() };
}

async function saveQuota(q: QuotaRecord): Promise<void> {
  await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(q));
}

interface ScanState {
  currentResult: ScanResult | null;
  history: ScanResult[];
  sessionScans: number;
  isAnalyzing: boolean;
  flashEnabled: boolean;
  error: string | null;
  canScan: boolean;
  analyzingStage: string | null;
  aiAnalysis: AIAnalysisResult | null;
  offlineMode: boolean;

  // quota
  totalScansUsed: number;
  dailyScansLimit: number;
  quotaPeriodStart: number;
  isPremium: boolean;
  showPaywall: boolean;
  paywallReason: 'quota' | 'feature';
  historyLoaded: boolean;

  analyze: (imageUri: string) => Promise<void>;
  analyzeBarcode: (code: string) => Promise<void>;
  clearResult: () => void;
  toggleFlash: () => void;
  resetSession: () => void;
  loadHistory: () => Promise<void>;
  initQuota: () => Promise<void>;
  dismissPaywall: () => void;
  requestPaywall: (reason?: 'quota' | 'feature') => void;
  setPremium: (isPremium: boolean) => void;
  syncPremiumFromServer: () => Promise<void>;
}

export const useScanStore = create<ScanState>((set, get) => ({
  currentResult: null,
  history: [],
  sessionScans: 0,
  isAnalyzing: false,
  flashEnabled: false,
  error: null,
  canScan: true,
  analyzingStage: null,
  aiAnalysis: null,
  offlineMode: false,
  totalScansUsed: 0,
  dailyScansLimit: FREE_SCANS_PER_DAY,
  quotaPeriodStart: 0,
  isPremium: false,
  showPaywall: false,
  paywallReason: 'quota',
  historyLoaded: false,

  // ── Init quota from AsyncStorage ─────────────────────────────────────────

  initQuota: async () => {
    const q = await loadQuota();
    set({ totalScansUsed: q.totalScans, isPremium: q.isPremium, quotaPeriodStart: q.periodStart });
    await saveQuota(q); // persist the day-rollover reset if loadQuota() just applied one

    // Restore history from AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) {
        const history: ScanResult[] = JSON.parse(raw);
        set({ history, historyLoaded: true });
      } else {
        set({ historyLoaded: true });
      }
    } catch {
      set({ historyLoaded: true });
    }
  },

  // ── Camera / gallery scan ────────────────────────────────────────────────

  analyze: async (imageUri) => {
    const { totalScansUsed, dailyScansLimit, quotaPeriodStart, isPremium } = get();
    if (!isPremium && totalScansUsed >= dailyScansLimit) {
      set({ showPaywall: true, paywallReason: 'quota' });
      return;
    }

    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null, offlineMode: false,
          analyzingStage: ANALYZE_STAGES[0] });

    const cancelStages = scheduleStages(ANALYZE_STAGES, 2200, set);

    try {
      const res = await scanService.analyzeImage(imageUri);
      cancelStages();

      if (!res.success || !res.data) {
        if (res.message === 'quota_exceeded') {
          set({ isAnalyzing: false, analyzingStage: null, showPaywall: true, paywallReason: 'quota' });
          return;
        }
        set({
          isAnalyzing: false,
          analyzingStage: null,
          error: res.message === 'invalid_object' ? 'invalid_object'
               : res.message === 'auth_required' ? 'auth_required'
               : (res.message ?? 'Could not identify product. Please try again.'),
        });
        return;
      }

      const newHistory = [res.data!, ...get().history].slice(0, MAX_HISTORY);
      const newUsed = totalScansUsed + 1;
      const quota: QuotaRecord = { totalScans: newUsed, isPremium, periodStart: quotaPeriodStart };
      await saveQuota(quota);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

      set(s => ({
        isAnalyzing: false,
        analyzingStage: null,
        currentResult: res.data,
        aiAnalysis: null,
        offlineMode: res.data!.offlineMode ?? false,
        sessionScans: s.sessionScans + 1,
        history: newHistory,
        totalScansUsed: newUsed,
      }));
    } catch (e: any) {
      cancelStages();
      set({ isAnalyzing: false, analyzingStage: null, error: e?.message ?? 'Scan failed. Please try again.' });
    }
  },

  // ── Barcode scan ─────────────────────────────────────────────────────────

  analyzeBarcode: async (code) => {
    const { totalScansUsed, dailyScansLimit, quotaPeriodStart, isPremium } = get();
    if (!isPremium && totalScansUsed >= dailyScansLimit) {
      set({ showPaywall: true, paywallReason: 'quota' });
      return;
    }

    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null, offlineMode: false, analyzingStage: BARCODE_STAGES[0] });

    const cancelStages = scheduleStages(BARCODE_STAGES, 1800, set);

    try {
      const res = await scanService.scanBarcode(code);
      cancelStages();
      if (!res.success || !res.data) {
        if (res.message === 'quota_exceeded') {
          set({ isAnalyzing: false, analyzingStage: null, showPaywall: true, paywallReason: 'quota' });
          return;
        }
        set({ isAnalyzing: false, analyzingStage: null, error: 'Product not found in database.' });
        return;
      }

      const newHistory = [res.data, ...get().history].slice(0, MAX_HISTORY);
      const newUsed = totalScansUsed + 1;
      const quota: QuotaRecord = { totalScans: newUsed, isPremium, periodStart: quotaPeriodStart };
      await saveQuota(quota);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

      set(s => ({
        isAnalyzing: false,
        analyzingStage: null,
        currentResult: res.data,
        aiAnalysis: null,
        offlineMode: false,
        sessionScans: s.sessionScans + 1,
        history: newHistory,
        totalScansUsed: newUsed,
      }));
    } catch (e: any) {
      cancelStages();
      set({
        isAnalyzing: false,
        analyzingStage: null,
        error: e?.message?.includes('not found')
          ? 'Product barcode not in database yet.'
          : 'Could not connect to backend. Is it running?',
      });
    }
  },

  // ── Utilities ────────────────────────────────────────────────────────────

  clearResult: () => set({ currentResult: null, aiAnalysis: null, offlineMode: false, error: null }),

  toggleFlash: () => set(s => ({ flashEnabled: !s.flashEnabled })),

  resetSession: () => set({ sessionScans: 0, canScan: true, currentResult: null, aiAnalysis: null, offlineMode: false }),

  dismissPaywall: () => set({ showPaywall: false }),

  requestPaywall: (reason = 'feature') => set({ showPaywall: true, paywallReason: reason }),

  setPremium: async (isPremium: boolean) => {
    const { totalScansUsed, quotaPeriodStart } = get();
    const quota: QuotaRecord = { totalScans: totalScansUsed, isPremium, periodStart: quotaPeriodStart };
    await saveQuota(quota);
    set({ isPremium, showPaywall: false });
  },

  // Reconciles the locally cached premium flag with the backend's authoritative
  // subscription record — corrects drift from an expired subscription (the client
  // never flips isPremium to false on its own) or a fresh install/reinstall where
  // AsyncStorage doesn't yet reflect a subscription the server already knows about.
  syncPremiumFromServer: async () => {
    try {
      const res = await paymentService.getSubscriptionStatus();
      if (res.success && res.data && res.data.isActive !== get().isPremium) {
        await get().setPremium(res.data.isActive);
      }
    } catch {
      // Offline or backend unreachable — keep the locally cached premium state.
    }
  },

  loadHistory: async () => {
    try {
      const res = await scanService.getScanHistory();
      if (res.success && res.data && res.data.length > 0) {
        const merged = res.data;
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
        set({ history: merged, historyLoaded: true });
      }
    } catch { /* history stays from AsyncStorage cache */ }
  },
}));