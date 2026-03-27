import { create } from "zustand";
import type { User } from "@shared/schema";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  showAuthModal: boolean;
  authModalMessage: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  openAuthModal: (message?: string) => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  showAuthModal: false,
  authModalMessage: null,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  openAuthModal: (message) => set({ showAuthModal: true, authModalMessage: message || null }),
  closeAuthModal: () => set({ showAuthModal: false, authModalMessage: null }),
}));
