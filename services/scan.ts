import { identifyProduct, isGeminiConfigured, researchFromSnippets } from '@/services/gemini';
import { searchProduct } from '@/services/duckduckgo';
import { api } from '@/utils/api';
import { buildProductGoogleUrl } from '@/utils/links';
import type { ApiResponse, AuthenticityStatus, ScanResult } from '@/types';

function mimeFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/** Client-side pipeline: Gemini Vision → DuckDuckGo search → Gemini price/specs. */
async function analyzeImageLocally(imageUri: string): Promise<ScanResult> {
  if (!isGeminiConfigured()) {
    throw new Error('Set EXPO_PUBLIC_GEMINI_API_KEY in .env.local to scan without the backend.');
  }

  const mimeType = mimeFromUri(imageUri);
  const info = await identifyProduct(imageUri, mimeType);
  if (!info) {
    throw new Error('invalid_object');
  }

  const ddg = await searchProduct(info.name, info.brand, info.category);
  const research = await researchFromSnippets(info, ddg.snippets);

  const price = research?.priceTypical
    ?? ddg.detectedPrice
    ?? research?.priceMin
    ?? 0;

  const authenticity: AuthenticityStatus = research?.authenticity ?? 'authentic';

  return {
    id: `local_${Date.now()}`,
    product: {
      id: `prod_${Date.now()}`,
      name: info.name,
      brand: info.brand,
      category: info.category,
      description: info.description,
      imageUrl: imageUri,
      price,
      currency: 'GHS',
      origin: 'Ghana',
      specs: research?.specs ?? {},
      verified: false,
      authenticity,
      sellers: ddg.sellers,
    },
    confidence: 88,
    scannedAt: new Date().toISOString(),
    authenticityStatus: authenticity,
    imageUri,
    offlineMode: true,
    googleSearchUrl: ddg.googleSearchUrl,
    duckDuckGoSearchUrl: ddg.duckDuckGoSearchUrl,
  };
}

export const scanService = {

  async analyzeImage(imageUri: string): Promise<ApiResponse<ScanResult>> {
    // 1. Try backend (Gemini Vision + DuckDuckGo on server)
    try {
      const filename = imageUri.split('/').pop() ?? 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const formData = new FormData();
      formData.append('image', { uri: imageUri, name: filename, type: mimeType } as any);

      const backendResult = await api.postForm<ScanResult>('/scans/analyze', formData);
      const product = backendResult.product.imageUrl
        ? backendResult.product
        : { ...backendResult.product, imageUrl: imageUri };

      const googleSearchUrl = backendResult.googleSearchUrl
        ?? buildProductGoogleUrl(product.name, product.brand);

      return {
        success: true,
        data: {
          ...backendResult,
          imageUri,
          product,
          confidence: backendResult.confidence ?? 90,
          googleSearchUrl,
        },
      };
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('422') || msg.toLowerCase().includes('valid object') || msg.toLowerCase().includes('identify')) {
        return { success: false, message: 'invalid_object' } as any;
      }
      if (msg.includes('401') || msg.includes('403')) {
        return { success: false, message: 'auth_required' } as any;
      }
    }

    // 2. Fallback: Gemini Vision + DuckDuckGo on device
    try {
      const data = await analyzeImageLocally(imageUri);
      return { success: true, data };
    } catch (err: any) {
      if (err?.message === 'invalid_object') {
        return { success: false, message: 'invalid_object' } as any;
      }
      return {
        success: false,
        message: err?.message ?? 'Could not identify product. Check your Gemini API key and try again.',
      } as any;
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
