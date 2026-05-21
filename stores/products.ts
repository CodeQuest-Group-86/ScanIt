import { create } from 'zustand';
import type { Product, Recommendation, Notification, PriceAlert } from '@/types';
import { productService } from '@/services/products';

interface ProductsState {
  products: Product[];
  searchResults: Product[];
  recommendations: Recommendation[];
  notifications: Notification[];
  priceAlerts: PriceAlert[];
  selectedProduct: Product | null;
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;
  search: (query: string, category?: string) => Promise<void>;
  setCategory: (category: string) => void;
  selectProduct: (product: Product | null) => void;
  loadRecommendations: (productId: string) => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadPriceAlerts: () => Promise<void>;
  unreadNotificationsCount: number;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  searchResults: [],
  recommendations: [],
  notifications: [],
  priceAlerts: [],
  selectedProduct: null,
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  error: null,
  unreadNotificationsCount: 0,

  search: async (query, category) => {
    const cat = category ?? get().selectedCategory;
    set({ isLoading: true, error: null, searchQuery: query });
    const res = await productService.getProducts(query, cat);
    if (res.success) {
      set({ searchResults: res.data, isLoading: false });
    } else {
      set({ isLoading: false, error: res.message ?? 'Search failed' });
    }
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
    get().search(get().searchQuery, category);
  },

  selectProduct: (product) => set({ selectedProduct: product }),

  loadRecommendations: async (productId) => {
    const res = await productService.getRecommendations(productId);
    if (res.success) set({ recommendations: res.data });
  },

  loadNotifications: async () => {
    const res = await productService.getNotifications();
    if (res.success) {
      const unread = res.data.filter(n => !n.read).length;
      set({ notifications: res.data, unreadNotificationsCount: unread });
    }
  },

  loadPriceAlerts: async () => {
    const res = await productService.getPriceAlerts();
    if (res.success) set({ priceAlerts: res.data });
  },
}));
