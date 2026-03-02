"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Language, Currency, Vendor, VendorStats, LotteryTicket, Transaction, Notification, Advertisement, Reward, WalletBalance, Payout } from "@/types";

interface AppState {
  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // Preferences
  language: Language;
  currency: Currency;
  hasCompletedOnboarding: boolean;

  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Player data
  wallet: WalletBalance | null;
  tickets: LotteryTicket[];
  transactions: Transaction[];
  rewards: Reward[];
  notifications: Notification[];

  // Vendor data  
  vendorProfile: Vendor | null;
  vendorStats: VendorStats | null;

  // Shared
  vendors: Vendor[];
  advertisements: Advertisement[];
  payouts: Payout[];

  // Actions — Preferences
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  completeOnboarding: () => void;

  // Actions — Auth
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;

  // Actions — Player
  setWallet: (wallet: WalletBalance) => void;
  setTickets: (tickets: LotteryTicket[]) => void;
  addTicket: (ticket: LotteryTicket) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setRewards: (rewards: Reward[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;

  // Actions — Vendor
  setVendorProfile: (vendor: Vendor) => void;
  setVendorStats: (stats: VendorStats) => void;
  setPayouts: (payouts: Payout[]) => void;

  // Actions — Shared
  setVendors: (vendors: Vendor[]) => void;
  setAdvertisements: (ads: Advertisement[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Hydration
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      // Initial state
      language: "en",
      currency: "HTG",
      hasCompletedOnboarding: false,
      user: null,
      isAuthenticated: false,
      wallet: null,
      tickets: [],
      transactions: [],
      rewards: [],
      notifications: [],
      vendorProfile: null,
      vendorStats: null,
      vendors: [],
      advertisements: [],
      payouts: [],

      // Preferences
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      // Auth — enrich firstName/lastName from backend "name" field
      setUser: (user) => {
        const parts = user.name?.split(" ") || [];
        const enriched = {
          ...user,
          firstName: user.firstName || parts[0] || "",
          lastName: user.lastName || parts.slice(1).join(" ") || "",
        };
        set({ user: enriched, isAuthenticated: true });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          wallet: null,
          tickets: [],
          transactions: [],
          rewards: [],
          notifications: [],
          vendorProfile: null,
          vendorStats: null,
          payouts: [],
        }),

      // Player
      setWallet: (wallet) => set({ wallet }),
      setTickets: (tickets) => set({ tickets }),
      addTicket: (ticket) =>
        set((state) => ({ tickets: [ticket, ...state.tickets] })),
      setTransactions: (transactions) => set({ transactions }),
      setRewards: (rewards) => set({ rewards }),
      setNotifications: (notifications) => set({ notifications }),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),

      // Vendor
      setVendorProfile: (vendor) => set({ vendorProfile: vendor }),
      setVendorStats: (stats) => set({ vendorStats: stats }),
      setPayouts: (payouts) => set({ payouts }),

      // Shared
      setVendors: (vendors) => set({ vendors }),
      setAdvertisements: (ads) => set({ advertisements: ads }),
    }),
    {
      name: "grolotto-web-store",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        // SSR fallback
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        language: state.language,
        currency: state.currency,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ _hasHydrated: true });
      },
    }
  )
);
