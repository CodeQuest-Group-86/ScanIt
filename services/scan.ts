/**
 * services/scan.ts
 *
 * Orchestrates the two-step scan pipeline:
 *   1. AI analysis  — runs on HuggingFace (or on-device TFLite). Always works.
 *   2. Backend lookup — Spring Boot matches the AI label to a product in the DB.
 *
 * If the backend is offline (e.g. localhost not reachable on a physical device),
 * the service returns an "offline mode" result that still shows the AI label so
 * the user understands what was detected — just without price/seller data.
 *
 * HOW TO FIX "OFFLINE" ERROR:
 *   • Emulator:  set EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
 *   • Real device on same WiFi: set EXPO_PUBLIC_API_URL=http://192.168.X.X:8080/api/v1
 *   • Deploy to Railway/Render and use the public HTTPS URL
 */

import { api } from '@/utils/api';
import { aiService } from './ai';
import type { ApiResponse, ScanResult, AuthenticityStatus, Product } from '@/types';

export const scanService = {

  // ── Image scan (camera capture or gallery pick) ──────────────────────────

  async analyzeImage(imageUri: string): Promise<ApiResponse<ScanResult>> {
    // ── Step 1: AI analysis (works offline — HuggingFace or fake-data fallback) ──
    let aiAnalysis = null;
    try {
      aiAnalysis = await aiService.analyzeImage(imageUri);
    } catch {
      // AI pipeline failed completely (very rare). Continue with backend only.
    }

    // Extract the top label detected by vision models — used for backend keyword search
    const imageLabel = aiAnalysis?.recognition?.label ?? '';

    // Derive authenticity status from ResNet-50 confidence score
    const authScore = aiAnalysis?.authenticity?.confidence ?? 80;
    const authenticityStatus: AuthenticityStatus =
      authScore >= 80 ? 'authentic' : authScore >= 55 ? 'suspicious' : 'counterfeit';

    // ── Step 2: Backend product lookup ──────────────────────────────────────
    // Pass imageLabel so the backend can do a smart keyword search instead of random hash.
    try {
      const backendResult = await api.post<ScanResult>('/scans/analyze', { imageUri, imageLabel });
      return {
        success: true,
        data: {
          ...backendResult,
          aiAnalysis: aiAnalysis ?? undefined,
          // Use AI confidence — it's more meaningful than the backend's hash-based value
          confidence: aiAnalysis?.overallConfidence ?? backendResult.confidence,
          authenticityStatus:
            (backendResult.authenticityStatus as AuthenticityStatus) ?? authenticityStatus,
        },
      };
    } catch {
      // ── Offline fallback ─────────────────────────────────────────────────
      // Backend is unreachable (not started, wrong URL, or no internet).
      // We still return a result so the user can see what the AI detected.
      // offlineMode=true tells the UI to show a "connect to backend" warning.
      const offlineProduct: Product = {
        id: 'offline',
        name: imageLabel
          ? imageLabel.charAt(0).toUpperCase() + imageLabel.slice(1).replace(/_/g, ' ')
          : 'Scanned Product',
        brand: 'Unknown',
        category: 'General',
        description:
          'Backend server not reachable. Start the Spring Boot backend to see full product details, prices and nearby sellers.',
        imageUrl: imageUri,
        price: 0,
        currency: 'GHS',
        origin: 'Ghana',
        specs: {},
        verified: false,
        authenticity: authenticityStatus,
        sellers: [],
      };

      return {
        success: true,
        data: {
          id: `offline_${Date.now()}`,
          product: offlineProduct,
          confidence: aiAnalysis?.overallConfidence ?? 70,
          scannedAt: new Date().toISOString(),
          authenticityStatus,
          imageUri,
          aiAnalysis: aiAnalysis ?? undefined,
          offlineMode: true,
        },
      };
    }
  },

  // ── Barcode scan ─────────────────────────────────────────────────────────

  /**
   * Look up a product by barcode (EAN-13, QR code, etc.).
   * Requires backend to be running — barcodes are matched against the DB.
   * Returns confidence=99 since barcode lookup is exact.
   */
  async scanBarcode(code: string): Promise<ApiResponse<ScanResult>> {
    const backendResult = await api.get<ScanResult>(`/scans/barcode/${code}`);
    return {
      success: true,
      data: { ...backendResult, confidence: 99 },
    };
  },

  // ── History ───────────────────────────────────────────────────────────────

  async getScanHistory(_userId: string): Promise<ApiResponse<ScanResult[]>> {
    try {
      const data = await api.get<ScanResult[]>('/scans/history');
      return { success: true, data };
    } catch {
      // History is non-critical — return empty list if backend offline
      return { success: true, data: [] };
    }
  },
};
