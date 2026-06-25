import { productService } from '@/services/products';
import type { Product } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const SAVED_KEY = 'scanit_saved_products';

interface SavedState {
  savedProducts: Product[];
  isLoaded: boolean;
  /** Load from AsyncStorage cache, then hydrate from backend when online */
  load: () => Promise<void>;
  save: (product: Product) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  isSaved: (productId: string) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedProducts: [],
  isLoaded: false,

  load: async () => {
    // 1. Load cached products from AsyncStorage immediately for instant UI
    try {
      const raw = await AsyncStorage.getItem(SAVED_KEY);
      const cached: Product[] = raw ? JSON.parse(raw) : [];
      set({ savedProducts: cached, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }

    // 2. Hydrate from backend in the background (authenticated users only)
    try {
      const res = await productService.getSavedProducts();
      if (res.success && res.data.length > 0) {
        set({ savedProducts: res.data });
        await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(res.data));
      }
    } catch {
      // Backend unreachable — stay with cached data
    }
  },

  save: async (product) => {
    if (get().isSaved(product.id)) return;
    const updated = [product, ...get().savedProducts];
    set({ savedProducts: updated });
    // Persist locally immediately
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    // Sync to backend (best-effort — don't block or show errors)
    productService.saveProduct(product.id).catch(() => null);
  },

  remove: async (productId) => {
    const updated = get().savedProducts.filter(p => p.id !== productId);
    set({ savedProducts: updated });
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    // Sync to backend (best-effort)
    productService.unsaveProduct(productId).catch(() => null);
  },

  isSaved: (productId) => get().savedProducts.some(p => p.id === productId),
}));
