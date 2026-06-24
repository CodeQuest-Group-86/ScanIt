import { create } from 'zustand';
import type { ScanResult, AIAnalysisResult } from '@/types';
import { scanService } from '@/services/scan';

const MAX_HISTORY = 50;

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

  analyze: (imageUri: string) => Promise<void>;
  analyzeBarcode: (code: string) => Promise<void>;
  clearResult: () => void;
  toggleFlash: () => void;
  resetSession: () => void;
  loadHistory: (userId: string) => Promise<void>;
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

  // ── Camera / gallery scan ────────────────────────────────────────────────

  analyze: async (imageUri) => {
    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null, offlineMode: false });

    const stages = [
      'HuggingFace Vision…',
      'MobileNet classification…',
      'CLIP similarity…',
      'ResNet-50 authenticity check…',
      'Matching product…',
    ];
    let stageIdx = 0;
    set({ analyzingStage: stages[0] });
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      set({ analyzingStage: stages[stageIdx] });
    }, 500);

    try {
      const res = await scanService.analyzeImage(imageUri);
      clearInterval(stageTimer);

      if (!res.success || !res.data) {
        set({
          isAnalyzing: false,
          analyzingStage: null,
          error: res.message ?? 'Could not identify product. Please try again.',
        });
        return;
      }

      set(s => ({
        isAnalyzing: false,
        analyzingStage: null,
        currentResult: res.data,
        aiAnalysis: res.data.aiAnalysis ?? null,
        offlineMode: res.data.offlineMode ?? false,
        sessionScans: s.sessionScans + 1,
        history: [res.data, ...s.history].slice(0, MAX_HISTORY),
      }));
    } catch (e: any) {
      clearInterval(stageTimer);
      set({
        isAnalyzing: false,
        analyzingStage: null,
        error: e?.message ?? 'Scan failed. Please try again.',
      });
    }
  },

  // ── Barcode scan ─────────────────────────────────────────────────────────

  analyzeBarcode: async (code) => {
    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null, offlineMode: false, analyzingStage: 'Looking up barcode…' });

    try {
      const res = await scanService.scanBarcode(code);
      if (!res.success || !res.data) {
        set({ isAnalyzing: false, analyzingStage: null, error: 'Product not found in database.' });
        return;
      }
      set(s => ({
        isAnalyzing: false,
        analyzingStage: null,
        currentResult: res.data,
        aiAnalysis: null,
        offlineMode: false,
        sessionScans: s.sessionScans + 1,
        history: [res.data, ...s.history].slice(0, MAX_HISTORY),
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

  clearResult: () => set({ currentResult: null, aiAnalysis: null, offlineMode: false }),

  toggleFlash: () => set(s => ({ flashEnabled: !s.flashEnabled })),

  resetSession: () => set({ sessionScans: 0, canScan: true, currentResult: null, aiAnalysis: null, offlineMode: false }),

  loadHistory: async (userId) => {
    try {
      const res = await scanService.getScanHistory(userId);
      if (res.success) set({ history: res.data });
    } catch { /* history stays empty if backend unreachable */ }
  },
}));
