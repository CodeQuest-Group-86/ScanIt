import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/types';

const SAVED_KEY = 'scanit_saved_products';

interface SavedState {
  savedProducts: Product[];
  isLoaded: boolean;
  load: () => Promise<void>;
  save: (product: Product) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  isSaved: (productId: string) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedProducts: [],
  isLoaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_KEY);
      const products: Product[] = raw ? JSON.parse(raw) : [];
      set({ savedProducts: products, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  save: async (product) => {
    if (get().isSaved(product.id)) return;
    const updated = [product, ...get().savedProducts];
    set({ savedProducts: updated });
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  },

  remove: async (productId) => {
    const updated = get().savedProducts.filter(p => p.id !== productId);
    set({ savedProducts: updated });
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  },

  isSaved: (productId) => get().savedProducts.some(p => p.id === productId),
}));
