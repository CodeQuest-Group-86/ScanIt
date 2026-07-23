import { create } from 'zustand';

interface SignupDraft {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  setDraft: (draft: Partial<SignupDraft>) => void;
  clear: () => void;
}

export const useSignupDraftStore = create<SignupDraft>((set) => ({
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  setDraft: (draft) => set((prev) => ({ ...prev, ...draft })),
  clear: () => set({ name: '', email: '', password: '', phoneNumber: '' }),
}));
