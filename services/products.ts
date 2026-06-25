import type { ApiResponse, InventoryItem, Notification, PriceAlert, Product, Recommendation } from '@/types';
import { api } from '@/utils/api';
import { aiService } from './ai';

export const productService = {
  async getProducts(query?: string, category?: string): Promise<ApiResponse<Product[]>> {
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (category && category !== 'All') params.set('category', category);
      const qs = params.toString() ? `?${params}` : '';
      const data = await api.get<Product[]>(`/products${qs}`);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load products', data: [] };
    }
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    try {
      const data = await api.get<Product>(`/products/${id}`);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load product', data: null as never };
    }
  },

  async getRecommendations(productId: string): Promise<ApiResponse<Recommendation[]>> {
    try {
      const data = await api.get<Recommendation[]>(`/products/${productId}/recommendations`);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load recommendations', data: [] };
    }
  },

  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    try {
      const data = await api.get<Notification[]>('/notifications');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load notifications', data: [] };
    }
  },

  async getPriceAlerts(): Promise<ApiResponse<PriceAlert[]>> {
    try {
      const data = await api.get<PriceAlert[]>('/notifications/price-alerts');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load price alerts', data: [] };
    }
  },

  async getInventory(): Promise<ApiResponse<InventoryItem[]>> {
    try {
      const data = await api.get<InventoryItem[]>('/sellers/inventory');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load inventory', data: [] };
    }
  },

  async getSavedProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const data = await api.get<Product[]>('/users/me/saved-products');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to load saved products', data: [] };
    }
  },

  async saveProduct(productId: string): Promise<ApiResponse<void>> {
    try {
      await api.post('/users/me/saved-products', { productId });
      return { success: true, data: undefined };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to save product', data: undefined };
    }
  },

  async unsaveProduct(productId: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/users/me/saved-products/${productId}`);
      return { success: true, data: undefined };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Failed to remove saved product', data: undefined };
    }
  },

  async semanticSearch(query: string, category?: string): Promise<ApiResponse<(Product & { semanticScore: number })[]>> {
    try {
      const res = await this.getProducts(query, category);
      if (!res.success) return { success: false, message: res.message, data: [] };
      const ranked = await aiService.semanticSearch(query, res.data);
      return { success: true, data: ranked };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Semantic search failed', data: [] };
    }
  },

  async findSimilarByImage(imageUri: string): Promise<ApiResponse<(Product & { similarityScore: number })[]>> {
    try {
      const res = await this.getProducts();
      if (!res.success) return { success: false, message: res.message, data: [] };
      const ranked = await aiService.findSimilar(imageUri, res.data);
      return { success: true, data: ranked };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Image search failed', data: [] };
    }
  },
};
