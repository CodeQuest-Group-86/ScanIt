import { api } from '@/utils/api';
import { aiService } from './ai';
import type { ApiResponse, ScanResult } from '@/types';

export const scanService = {
  async analyzeImage(imageUri: string): Promise<ApiResponse<ScanResult>> {
    // Run backend product lookup and AI analysis in parallel
    const [backendResult, aiAnalysis] = await Promise.all([
      api.post<ScanResult>('/scans/analyze', { imageUri }),
      aiService.analyzeImage(imageUri),
    ]);

    const authScore = aiAnalysis.authenticity.confidence;
    const authenticityStatus =
      authScore >= 80 ? 'authentic' :
      authScore >= 55 ? 'suspicious' : 'counterfeit';

    return {
      success: true,
      data: {
        ...backendResult,
        aiAnalysis,
        confidence: aiAnalysis.overallConfidence,
        authenticityStatus: backendResult.authenticityStatus ?? authenticityStatus,
      },
    };
  },

  async getScanHistory(_userId: string): Promise<ApiResponse<ScanResult[]>> {
    const data = await api.get<ScanResult[]>('/scans/history');
    return { success: true, data };
  },
};
