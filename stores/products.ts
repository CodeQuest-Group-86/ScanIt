import { create } from 'zustand';
import type { Product, Recommendation, Notification, PriceAlert } from '@/types';
import { productService } from '@/services/products';

type ScoredProduct = Product & { semanticScore?: number };

interface ProductsState {
  products: Product[];
  searchResults: ScoredProduct[];
  semanticResults: ScoredProduct[];
  recommendations: Recommendation[];
  notifications: Notification[];
  priceAlerts: PriceAlert[];
  selectedProduct: Product | null;
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  isSemanticMode: boolean;
  error: string | null;
  unreadNotificationsCount: number;
  search: (query: string, category?: string) => Promise<void>;
  semanticSearch: (query: string, category?: string) => Promise<void>;
  setCategory: (category: string) => void;
  setSemanticMode: (enabled: boolean) => void;
  selectProduct: (product: Product | null) => void;
  loadRecommendations: (productId: string) => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadPriceAlerts: () => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  searchResults: [],
  semanticResults: [],
  recommendations: [],
  notifications: [],
  priceAlerts: [],
  selectedProduct: null,
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  isSemanticMode: false,
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

  semanticSearch: async (query, category) => {
    const cat = category ?? get().selectedCategory;
    set({ isLoading: true, error: null, searchQuery: query });
    const res = await productService.semanticSearch(query, cat);
    if (res.success) {
      set({ searchResults: res.data, semanticResults: res.data, isLoading: false });
    } else {
      set({ isLoading: false, error: res.message ?? 'Semantic search failed' });
    }
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
    const { searchQuery, isSemanticMode } = get();
    if (isSemanticMode) {
      get().semanticSearch(searchQuery, category);
    } else {
      get().search(searchQuery, category);
    }
  },

  setSemanticMode: (enabled) => set({ isSemanticMode: enabled }),

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
