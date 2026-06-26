import { api } from '@/utils/api';
import type { ApiResponse, ScanResult, AuthenticityStatus } from '@/types';

export const scanService = {

  async analyzeImage(imageUri: string): Promise<ApiResponse<ScanResult>> {
    try {
      // Build multipart form — send raw image to backend, Gemini Vision runs there
      const filename = imageUri.split('/').pop() ?? 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const formData = new FormData();
      formData.append('image', { uri: imageUri, name: filename, type: mimeType } as any);

      const backendResult = await api.postForm<ScanResult>('/scans/analyze', formData);
      const product = backendResult.product.imageUrl
        ? backendResult.product
        : { ...backendResult.product, imageUrl: imageUri };
      return { success: true, data: { ...backendResult, imageUri, product, confidence: backendResult.confidence ?? 90 } };

    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('422') || msg.toLowerCase().includes('valid object') || msg.toLowerCase().includes('identify')) {
        return { success: false, message: 'invalid_object' } as any;
      }
      if (msg.includes('401') || msg.includes('403')) {
        return { success: false, message: 'auth_required' } as any;
      }
      // Backend unreachable
      return {
        success: true,
        data: {
          id: `offline_${Date.now()}`,
          product: {
            id: 'offline',
            name: 'Scanned Product',
            brand: 'Unknown',
            category: 'General',
            description: 'Backend not reachable — start the server to identify products.',
            imageUrl: imageUri,
            price: 0,
            currency: 'GHS',
            origin: 'Ghana',
            specs: {},
            verified: false,
            authenticity: 'authentic' as AuthenticityStatus,
            sellers: [],
          },
          confidence: 0,
          scannedAt: new Date().toISOString(),
          authenticityStatus: 'authentic' as AuthenticityStatus,
          imageUri,
          offlineMode: true,
        },
      };
    }
  },

  async scanBarcode(code: string): Promise<ApiResponse<ScanResult>> {
    try {
      const backendResult = await api.get<ScanResult>(`/scans/barcode/${code}`);
      return { success: true, data: { ...backendResult, confidence: 99 } };
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('401') || msg.includes('403')) {
        return { success: false, message: 'auth_required' } as any;
      }
      throw err;
    }
  },

  async getScanHistory(): Promise<ApiResponse<ScanResult[]>> {
    try {
      const data = await api.get<ScanResult[]>('/scans/history');
      return { success: true, data };
    } catch {
      return { success: true, data: [] };
    }
  },
};
