import { create } from 'zustand';
import type { ScanResult, AIAnalysisResult } from '@/types';
import { scanService } from '@/services/scan';

const MAX_SCANS_PER_SESSION = 50; // effectively unlimited for real use

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
  analyze: (imageUri: string) => Promise<void>;
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

  analyze: async (imageUri) => {
    set({ isAnalyzing: true, error: null, currentResult: null, aiAnalysis: null });

    const stages = [
      'Google Vision API…',
      'TensorFlow Lite…',
      'MobileNet classification…',
      'CLIP similarity…',
      'ResNet-50 counterfeit check…',
    ];
    let stageIdx = 0;
    set({ analyzingStage: stages[0] });
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      set({ analyzingStage: stages[stageIdx] });
    }, 420);

    try {
      const res = await scanService.analyzeImage(imageUri);
      clearInterval(stageTimer);

      if (!res.success) {
        set({ isAnalyzing: false, analyzingStage: null, error: res.message ?? 'Could not identify product. Please try again.' });
        return;
      }

      set(s => ({
        isAnalyzing: false,
        analyzingStage: null,
        currentResult: res.data,
        aiAnalysis: res.data.aiAnalysis ?? null,
        sessionScans: s.sessionScans + 1,
        history: [res.data, ...s.history],
      }));
    } catch (e: any) {
      clearInterval(stageTimer);
      set({ isAnalyzing: false, analyzingStage: null, error: e.message ?? 'Scan failed. Is the backend running?' });
    }
  },

  clearResult: () => set({ currentResult: null, aiAnalysis: null }),

  toggleFlash: () => set(s => ({ flashEnabled: !s.flashEnabled })),

  resetSession: () => set({ sessionScans: 0, canScan: true, currentResult: null, aiAnalysis: null }),

  loadHistory: async (userId) => {
    try {
      const res = await scanService.getScanHistory(userId);
      if (res.success) set({ history: res.data });
    } catch { /* history stays empty if backend unreachable */ }
  },
}));
