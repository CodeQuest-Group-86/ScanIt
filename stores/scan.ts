import { scanService } from '@/services/scan';
import type { AIAnalysisResult, ScanResult } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const MAX_HISTORY = 50;
const HISTORY_KEY = 'scanit_scan_history';
const QUOTA_KEY = 'scanit_scan_quota';
const FREE_SCANS_PER_DAY = 100; // TODO: restore to 5 before launch

// ── Quota helpers ──────────────────────────────────────────────────────────

interface QuotaRecord {
  date: string;   // YYYY-MM-DD
  count: number;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadQuota(): Promise<QuotaRecord> {
  try {
    const raw = await AsyncStorage.getItem(QUOTA_KEY);
    if (raw) {
      const q: QuotaRecord = JSON.parse(raw);
      if (q.date === todayString()) return q;
    }
  } catch { /* ignore */ }
  return { date: todayString(), count: 0 };
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
  dailyScansUsed: number;
  dailyScansLimit: number;
  isPremium: boolean;
  showPaywall: boolean;
  historyLoaded: boolean;

  analyze: (imageUri: string) => Promise<void>;
  analyzeBarcode: (code: string) => Promise<void>;
  clearResult: () => void;
  toggleFlash: () => void;
  resetSession: () => void;
  loadHistory: () => Promise<void>;
  initQuota: () => Promise<void>;
  dismissPaywall: () => void;
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
  dailyScansUsed: 0,
  dailyScansLimit: FREE_SCANS_PER_DAY,
  isPremium: false,
  showPaywall: false,
  historyLoaded: false,

  // ── Init quota from AsyncStorage ─────────────────────────────────────────

  initQuota: async () => {
    const q = await loadQuota();
    set({ dailyScansUsed: q.count });

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
    const { dailyScansUsed, dailyScansLimit, isPremium } = get();
    if (!isPremium && dailyScansUsed >= dailyScansLimit) {
      set({ showPaywall: true });
      return;
    }

    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null, offlineMode: false,
          analyzingStage: 'Identifying product…' });

    try {
      const res = await scanService.analyzeImage(imageUri);

      if (!res.success || !res.data) {
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
      const newUsed = dailyScansUsed + 1;
      const quota: QuotaRecord = { date: todayString(), count: newUsed };
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
        dailyScansUsed: newUsed,
      }));
    } catch (e: any) {
      set({ isAnalyzing: false, analyzingStage: null, error: e?.message ?? 'Scan failed. Please try again.' });
    }
  },

  // ── Barcode scan ─────────────────────────────────────────────────────────

  analyzeBarcode: async (code) => {
    const { dailyScansUsed, dailyScansLimit, isPremium } = get();
    if (!isPremium && dailyScansUsed >= dailyScansLimit) {
      set({ showPaywall: true });
      return;
    }

    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null, offlineMode: false, analyzingStage: 'Looking up barcode…' });

    try {
      const res = await scanService.scanBarcode(code);
      if (!res.success || !res.data) {
        set({ isAnalyzing: false, analyzingStage: null, error: 'Product not found in database.' });
        return;
      }

      const newHistory = [res.data, ...get().history].slice(0, MAX_HISTORY);
      const newUsed = dailyScansUsed + 1;
      const quota: QuotaRecord = { date: todayString(), count: newUsed };
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
        dailyScansUsed: newUsed,
      }));
    } catch (e: any) {
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
