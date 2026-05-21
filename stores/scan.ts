import { create } from 'zustand';
import type { ScanResult } from '@/types';
import { scanService } from '@/services/scan';

const MAX_SCANS_PER_SESSION = 3;

interface ScanState {
  currentResult: ScanResult | null;
  history: ScanResult[];
  sessionScans: number;
  isAnalyzing: boolean;
  flashEnabled: boolean;
  error: string | null;
  analyze: (imageUri: string) => Promise<void>;
  clearResult: () => void;
  toggleFlash: () => void;
  resetSession: () => void;
  loadHistory: (userId: string) => Promise<void>;
  canScan: boolean;
}

export const useScanStore = create<ScanState>((set, get) => ({
  currentResult: null,
  history: [],
  sessionScans: 0,
  isAnalyzing: false,
  flashEnabled: false,
  error: null,
  canScan: true,

  analyze: async (imageUri) => {
    const { sessionScans } = get();
    if (sessionScans >= MAX_SCANS_PER_SESSION) {
      set({ error: 'Session scan limit reached' });
      return;
    }
    set({ isAnalyzing: true, error: null, currentResult: null });
    const res = await scanService.analyzeImage(imageUri);
    if (!res.success) {
      set({ isAnalyzing: false, error: 'Could not identify product. Please try again.' });
      return;
    }
    const newCount = sessionScans + 1;
    set({
      isAnalyzing: false,
      currentResult: res.data,
      sessionScans: newCount,
      canScan: newCount < MAX_SCANS_PER_SESSION,
      history: [res.data, ...get().history],
    });
  },

  clearResult: () => set({ currentResult: null }),

  toggleFlash: () => set(s => ({ flashEnabled: !s.flashEnabled })),

  resetSession: () => set({ sessionScans: 0, canScan: true, currentResult: null }),

  loadHistory: async (userId) => {
    const res = await scanService.getScanHistory(userId);
    if (res.success) set({ history: res.data });
  },
}));
