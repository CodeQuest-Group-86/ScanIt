import { api } from '@/utils/api';
import { aiService } from './ai';
import type { ApiResponse, Product, Recommendation, Notification, PriceAlert, InventoryItem } from '@/types';

export const productService = {
  async getProducts(query?: string, category?: string): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (category && category !== 'All') params.set('category', category);
    const qs = params.toString() ? `?${params}` : '';
    const data = await api.get<Product[]>(`/products${qs}`);
    return { success: true, data };
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    const data = await api.get<Product>(`/products/${id}`);
    return { success: true, data };
  },

  async getRecommendations(productId: string): Promise<ApiResponse<Recommendation[]>> {
    const data = await api.get<Recommendation[]>(`/products/${productId}/recommendations`);
    return { success: true, data };
  },

  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    const data = await api.get<Notification[]>('/notifications');
    return { success: true, data };
  },

  async getPriceAlerts(): Promise<ApiResponse<PriceAlert[]>> {
    const data = await api.get<PriceAlert[]>('/notifications/price-alerts');
    return { success: true, data };
  },

  async getInventory(): Promise<ApiResponse<InventoryItem[]>> {
    const data = await api.get<InventoryItem[]>('/sellers/inventory');
    return { success: true, data };
  },

  async getSavedProducts(): Promise<ApiResponse<Product[]>> {
    const data = await api.get<Product[]>('/users/me/saved-products');
    return { success: true, data };
  },

  async saveProduct(productId: string): Promise<ApiResponse<void>> {
    await api.post('/users/me/saved-products', { productId });
    return { success: true, data: undefined };
  },

  async unsaveProduct(productId: string): Promise<ApiResponse<void>> {
    await api.delete(`/users/me/saved-products/${productId}`);
    return { success: true, data: undefined };
  },

  async semanticSearch(query: string, category?: string): Promise<ApiResponse<(Product & { semanticScore: number })[]>> {
    const res = await this.getProducts(query, category);
    const ranked = await aiService.semanticSearch(query, res.data);
    return { success: true, data: ranked };
  },

  async findSimilarByImage(imageUri: string): Promise<ApiResponse<(Product & { similarityScore: number })[]>> {
    const res = await this.getProducts();
    const ranked = await aiService.findSimilar(imageUri, res.data);
    return { success: true, data: ranked };
  },
};
