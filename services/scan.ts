import type { ApiResponse, ScanResult } from '@/types';
import { MOCK_PRODUCTS } from './products';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const scanService = {
  async analyzeImage(imageUri: string): Promise<ApiResponse<ScanResult>> {
    await delay(2200);

    const randomProduct = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];
    const confidence = Math.floor(Math.random() * 15) + 84;

    const result: ScanResult = {
      id: `scan_${Date.now()}`,
      product: randomProduct,
      confidence,
      scannedAt: new Date().toISOString(),
      authenticityStatus: randomProduct.authenticity,
      imageUri,
    };

    return { success: true, data: result };
  },

  async getScanHistory(userId: string): Promise<ApiResponse<ScanResult[]>> {
    await delay(500);

    const history: ScanResult[] = MOCK_PRODUCTS.slice(0, 3).map((p, i) => ({
      id: `scan_hist_${i}`,
      product: p,
      confidence: 92 - i * 3,
      scannedAt: new Date(Date.now() - i * 86400000).toISOString(),
      authenticityStatus: p.authenticity,
    }));

    return { success: true, data: history };
  },
};
