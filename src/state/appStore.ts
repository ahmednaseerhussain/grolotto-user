import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper function to create default draw settings
const createDefaultDrawSettings = (): DrawSettings => ({
  enabled: false,
  games: {
    senp: { enabled: true, minAmount: 1, maxAmount: 100 },
    maryaj: { enabled: false, minAmount: 1, maxAmount: 100 },
    loto3: { enabled: false, minAmount: 1, maxAmount: 100 },
    loto4: { enabled: false, minAmount: 1, maxAmount: 100 },
    loto5: { enabled: false, minAmount: 1, maxAmount: 100 },
  },
});

// Helper function to create default vendor draws
const createDefaultVendorDraws = () => ({
  NY: createDefaultDrawSettings(),
  FL: createDefaultDrawSettings(),
  GA: createDefaultDrawSettings(),
  TX: createDefaultDrawSettings(),
  PA: createDefaultDrawSettings(),
  CT: createDefaultDrawSettings(),
  TN: createDefaultDrawSettings(),
  NJ: createDefaultDrawSettings(),
});

// Helper function to create default advertisements
// Advertisements are fetched from the backend
const createDefaultAdvertisements = (): any[] => [];

export type Language = "ht" | "en" | "fr" | "es";
export type Currency = "USD" | "HTG";
export type UserRole = "player" | "vendor" | "admin";

// Payment system types
export type PaymentMethodType = "debit_card" | "gift_card" | "cashapp" | "moncash" | "natcash";
export type PayoutMethodType = "moncash" | "natcash" | "ach" | "cashapp" | "bank_transfer";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type TransactionType = "bet_payment" | "winning_payout" | "deposit" | "withdrawal";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  displayName: string;
  lastFourDigits?: string; // For cards
  phoneNumber?: string; // For MonCash/NatCash
  isDefault: boolean;
}

export interface PayoutMethod {
  id: string;
  type: PayoutMethodType;
  displayName: string;
  accountNumber?: string; // For ACH
  phoneNumber?: string; // For MonCash/NatCash
  bankName?: string; // For ACH
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  paymentMethod?: PaymentMethodType | PayoutMethodType;
  status: PaymentStatus;
  timestamp: number;
  description: string;
  gamePlayId?: string; // Link to game play if applicable
  vendorId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified?: boolean;
  // Payment methods for players
  paymentMethods?: PaymentMethod[];
  payoutMethods?: PayoutMethod[];
  balance?: number; // Player wallet balance
  // Profile information
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended" | "active";
export type PayoutStatus = "pending" | "approved" | "rejected" | "paid";

export interface VendorDocument {
  type: "id_card" | "business_license";
  url: string;
  uploadedAt: number;
  verified: boolean;
}

export interface GameSettings {
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
}

export interface NumberLimit {
  number: string;
  limit: number;
  currentTotal: number; // Total amount bet on this number so far
}

export interface DrawSettings {
  enabled: boolean;
  games: {
    senp: GameSettings;
    maryaj: GameSettings;
    loto3: GameSettings;
    loto4: GameSettings;
    loto5: GameSettings;
  };
  numberLimits?: NumberLimit[]; // Per-number betting limits for this draw
  stoppedNumbers?: string[]; // Numbers with sales stopped
}

export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  method: PayoutMethodType;
  requestDate: number;
  status: PayoutStatus;
  processedDate?: number;
  notes?: string;
  transferReference?: string;
  confirmationCode?: string;
}

export interface VendorNotification {
  id: string;
  vendorId: string;
  type: "result_published" | "player_played" | "payout_update" | "player_rating";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface VendorReview {
  id: string;
  vendorId: string;
  playerId: string;
  playerName: string;
  rating: number; // 1-5 stars
  comment: string;
  timestamp: number;
  gamePlay?: {
    gameType: string;
    draw: string;
    betAmount: number;
  };
  vendorResponse?: {
    message: string;
    timestamp: number;
  };
  isReported: boolean;
  reportReason?: string;
  isVisible: boolean;
}

export interface VendorProfile {
  bio?: string;
  location?: string;
  businessHours?: string;
  specialties?: string[];
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
  };
  profileImage?: string;
  bannerImage?: string;
}

export interface Vendor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  businessName?: string;
  displayName?: string;
  profile?: VendorProfile;
  
  // Approval system
  status: VendorStatus;
  applicationDate: number;
  approvedDate?: number;
  rejectionReason?: string;
  
  // Documents
  documents: VendorDocument[];
  
  // Draw and game management
  draws: {
    NY: DrawSettings;
    FL: DrawSettings;
    GA: DrawSettings;
    TX: DrawSettings;
    PA: DrawSettings;
    CT: DrawSettings;
    TN: DrawSettings;
    NJ: DrawSettings;
  };
  
  // Financial
  totalRevenue: number;
  availableBalance: number;
  totalPlayers: number;
  
  // Performance metrics
  rating: number;
  totalTicketsSold: number;
  
  // Activity tracking
  lastLogin?: number;
  isActive: boolean;
  
  // Admin notes
  notes?: string;
}

export interface GamePlay {
  id: string;
  playerId: string;
  vendorId: string;
  draw: "NY" | "FL" | "GA" | "TX" | "PA" | "CT" | "TN" | "NJ";
  gameType: "senp" | "maryaj" | "loto3" | "loto4" | "loto5";
  numbers: number[];
  betAmount: number;
  currency: Currency;
  timestamp: number;
  status: "pending" | "won" | "lost";
  winAmount?: number;
}

export interface Advertisement {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  type: "slideshow" | "banner" | "popup";
  status: "active" | "paused" | "scheduled" | "expired";
  startDate: number;
  endDate: number;
  clicks: number;
  impressions: number;
  targetAudience: "all" | "new_players" | "active_players";
  priority: "high" | "medium" | "low";
  order: number;
}

interface AppSettings {
  maintenanceMode: boolean;
  minBetAmount: number;
  maxBetAmount: number;
  systemCommission: number;
  allowedStates: string[];
  gameAvailability: {
    senp: boolean;
    maryaj: boolean;
    loto3: boolean;
    loto4: boolean;
    loto5: boolean;
  };
}

interface AppState {
  // App settings
  language: Language;
  currency: Currency;
  hasCompletedOnboarding: boolean;
  
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Vendors
  vendors: Vendor[];
  pendingVendors: Vendor[];
  selectedVendor: Vendor | null;
  
  // Game plays
  gamePlays: GamePlay[];
  
  // Payouts
  payouts: Payout[];
  
  // Notifications
  vendorNotifications: VendorNotification[];
  
  // Reviews
  vendorReviews: VendorReview[];
  
  // Advertisements
  advertisements: Advertisement[];
  
  // Transactions & Payments
  transactions: Transaction[];
  
  // Admin only
  allUsers: User[];
  appSettings: AppSettings;
  
  // Actions
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setUser: (user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  setVendors: (vendors: Vendor[]) => void;
  selectVendor: (vendor: Vendor) => void;
  addGamePlay: (gamePlay: GamePlay) => void;
  
  // Payment & Transaction actions
  addPaymentMethod: (userId: string, method: PaymentMethod) => void;
  removePaymentMethod: (userId: string, methodId: string) => void;
  setDefaultPaymentMethod: (userId: string, methodId: string) => void;
  addPayoutMethod: (userId: string, method: PayoutMethod) => void;
  removePayoutMethod: (userId: string, methodId: string) => void;
  setDefaultPayoutMethod: (userId: string, methodId: string) => void;
  processPayment: (transaction: Transaction) => void;
  processPayout: (transaction: Transaction) => void;
  getTransactionHistory: (userId: string) => Transaction[];
  
  // Advertisement actions
  addAdvertisement: (ad: Advertisement) => void;
  updateAdvertisement: (adId: string, updates: Partial<Advertisement>) => void;
  deleteAdvertisement: (adId: string) => void;
  recordAdClick: (adId: string) => void;
  recordAdImpression: (adId: string) => void;
  resetAdvertisements: () => void;
  
  // Vendor actions
  updateVendorDrawSettings: (vendorId: string, draw: string, settings: DrawSettings) => void;
  requestPayout: (vendorId: string, amount: number, method: PayoutMethodType) => void;
  updatePayout: (payout: Payout) => void;
  addVendorNotification: (notification: VendorNotification) => void;
  markNotificationRead: (notificationId: string) => void;

  // Number limit management
  setNumberLimit: (vendorId: string, draw: string, number: string, limit: number) => void;
  removeNumberLimit: (vendorId: string, draw: string, number: string) => void;
  stopNumberSales: (vendorId: string, draw: string, number: string) => void;
  resumeNumberSales: (vendorId: string, draw: string, number: string) => void;
  updateNumberBetTotal: (vendorId: string, draw: string, number: string, amount: number) => void;
  getNumberLimit: (vendorId: string, draw: string, number: string) => NumberLimit | undefined;
  checkNumberLimitAvailable: (vendorId: string, draw: string, number: string, betAmount: number) => { allowed: boolean; remaining: number; message?: string };
  
  // Review management
  addVendorReview: (review: VendorReview) => void;
  respondToReview: (reviewId: string, response: string) => void;
  reportReview: (reviewId: string, reason: string) => void;
  hideReview: (reviewId: string) => void;
  updateVendorProfile: (vendorId: string, profile: Partial<VendorProfile>) => void;
  
  // Admin actions
  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => void;
  removeVendor: (vendorId: string) => void;
  suspendVendor: (vendorId: string) => void;
  activateVendor: (vendorId: string) => void;
  approveVendor: (vendorId: string) => void;
  rejectVendor: (vendorId: string, reason?: string) => void;
  setPendingVendors: (vendors: Vendor[]) => void;
  resetVendorPassword: (vendorId: string) => void;
  sendVendorInvite: (email: string) => void;
  setAllUsers: (users: User[]) => void;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  getSystemStats: () => {
    totalUsers: number;
    activeVendors: number;
    totalRevenue: number;
    todayGames: number;
    pendingApprovals: number;
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      language: "en",
      currency: "USD",
      hasCompletedOnboarding: false,
      user: null,
      isAuthenticated: false,
      vendors: [],
      pendingVendors: [],
      selectedVendor: null,
      gamePlays: [],
      advertisements: [],
      payouts: [],
      vendorNotifications: [],
      vendorReviews: [],
      allUsers: [],
      appSettings: {
        maintenanceMode: false,
        minBetAmount: 1,
        maxBetAmount: 10000,
        systemCommission: 0.1,
        allowedStates: ["GA", "NY", "FL", "CT", "MA", "NJ"],
        gameAvailability: {
          senp: true,
          maryaj: true,
          loto3: true,
          loto4: true,
          loto5: true,
        }
      },
      
      // Transactions (empty initially)
      transactions: [],
      
      // Actions
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
      setUser: (user) => set({ user, isAuthenticated: true }),
      updateUser: (user) => set((state) => ({ 
        user: state.user?.id === user.id ? user : state.user,
        allUsers: state.allUsers.map(u => u.id === user.id ? user : u)
      })),
      logout: () => set({ user: null, isAuthenticated: false }),
      setVendors: (vendors) => set({ vendors }),
      selectVendor: (vendor) => set({ selectedVendor: vendor }),
      addGamePlay: (gamePlay) => 
        set((state) => ({ gamePlays: [...state.gamePlays, gamePlay] })),
      
      // Payment & Transaction actions
      addPaymentMethod: (userId, method) =>
        set((state) => ({
          user: state.user?.id === userId
            ? { ...state.user, paymentMethods: [...(state.user.paymentMethods || []), method] }
            : state.user
        })),
      removePaymentMethod: (userId, methodId) =>
        set((state) => ({
          user: state.user?.id === userId
            ? { ...state.user, paymentMethods: (state.user.paymentMethods || []).filter(m => m.id !== methodId) }
            : state.user
        })),
      setDefaultPaymentMethod: (userId, methodId) =>
        set((state) => ({
          user: state.user?.id === userId
            ? {
                ...state.user,
                paymentMethods: (state.user.paymentMethods || []).map(m => ({
                  ...m,
                  isDefault: m.id === methodId
                }))
              }
            : state.user
        })),
      addPayoutMethod: (userId, method) =>
        set((state) => ({
          user: state.user?.id === userId
            ? { ...state.user, payoutMethods: [...(state.user.payoutMethods || []), method] }
            : state.user
        })),
      removePayoutMethod: (userId, methodId) =>
        set((state) => ({
          user: state.user?.id === userId
            ? { ...state.user, payoutMethods: (state.user.payoutMethods || []).filter(m => m.id !== methodId) }
            : state.user
        })),
      setDefaultPayoutMethod: (userId, methodId) =>
        set((state) => ({
          user: state.user?.id === userId
            ? {
                ...state.user,
                payoutMethods: (state.user.payoutMethods || []).map(m => ({
                  ...m,
                  isDefault: m.id === methodId
                }))
              }
            : state.user
        })),
      processPayment: (transaction) =>
        set((state) => ({ 
          transactions: [...state.transactions, transaction],
          user: state.user?.id === transaction.userId 
            ? {
                ...state.user, 
                balance: transaction.type === 'deposit'
                  ? (state.user.balance || 0) + transaction.amount  // Add money for deposits
                  : transaction.type === 'bet_payment'
                  ? (state.user.balance || 0) - transaction.amount  // Subtract money for bets
                  : state.user.balance || 0  // No change for other types
              }
            : state.user
        })),
      processPayout: (transaction) =>
        set((state) => ({
          transactions: [...state.transactions, transaction],
          user: state.user?.id === transaction.userId && transaction.type === 'winning_payout'
            ? { ...state.user, balance: (state.user.balance || 0) + transaction.amount }
            : state.user
        })),
      getTransactionHistory: (userId) => {
        const state = get();
        return state.transactions.filter(t => t.userId === userId);
      },
      
      // Advertisement actions
      addAdvertisement: (ad) =>
        set((state) => ({ advertisements: [...state.advertisements, ad] })),
      updateAdvertisement: (adId, updates) =>
        set((state) => ({
          advertisements: state.advertisements.map(ad =>
            ad.id === adId ? { ...ad, ...updates } : ad
          )
        })),
      deleteAdvertisement: (adId) =>
        set((state) => ({
          advertisements: state.advertisements.filter(ad => ad.id !== adId)
        })),
      recordAdClick: (adId) =>
        set((state) => ({
          advertisements: state.advertisements.map(ad =>
            ad.id === adId ? { ...ad, clicks: ad.clicks + 1 } : ad
          )
        })),
      recordAdImpression: (adId) =>
        set((state) => ({
          advertisements: state.advertisements.map(ad =>
            ad.id === adId ? { ...ad, impressions: ad.impressions + 1 } : ad
          )
        })),
      resetAdvertisements: () =>
        set({ advertisements: createDefaultAdvertisements() }),
      
      // Vendor actions
      updateVendorDrawSettings: (vendorId, draw, settings) =>
        set((state) => ({
          vendors: state.vendors.map(v =>
            v.id === vendorId ? { ...v, draws: { ...v.draws, [draw]: settings } } : v
          )
        })),
      requestPayout: (vendorId, amount, method) => {
        const newPayout: Payout = {
          id: Date.now().toString(),
          vendorId,
          amount,
          method,
          requestDate: Date.now(),
          status: "pending"
        };
        set((state) => ({ payouts: [...state.payouts, newPayout] }));
      },
      updatePayout: (payout) =>
        set((state) => ({
          payouts: state.payouts.map(p => p.id === payout.id ? payout : p)
        })),
      addVendorNotification: (notification) =>
        set((state) => ({ 
          vendorNotifications: [...state.vendorNotifications, notification] 
        })),
      markNotificationRead: (notificationId) =>
        set((state) => ({
          vendorNotifications: state.vendorNotifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        })),

      // Number limit management actions
      setNumberLimit: (vendorId, draw, number, limit) =>
        set((state) => ({
          vendors: state.vendors.map(v => {
            if (v.id !== vendorId) return v;
            const drawSettings = v.draws[draw as keyof typeof v.draws];
            const existingLimits = drawSettings.numberLimits || [];
            const existingIndex = existingLimits.findIndex(nl => nl.number === number);

            let updatedLimits: NumberLimit[];
            if (existingIndex >= 0) {
              // Update existing limit
              updatedLimits = existingLimits.map((nl, idx) =>
                idx === existingIndex ? { ...nl, limit } : nl
              );
            } else {
              // Add new limit
              updatedLimits = [...existingLimits, { number, limit, currentTotal: 0 }];
            }

            return {
              ...v,
              draws: {
                ...v.draws,
                [draw]: { ...drawSettings, numberLimits: updatedLimits }
              }
            };
          })
        })),

      removeNumberLimit: (vendorId, draw, number) =>
        set((state) => ({
          vendors: state.vendors.map(v => {
            if (v.id !== vendorId) return v;
            const drawSettings = v.draws[draw as keyof typeof v.draws];
            const updatedLimits = (drawSettings.numberLimits || []).filter(nl => nl.number !== number);

            return {
              ...v,
              draws: {
                ...v.draws,
                [draw]: { ...drawSettings, numberLimits: updatedLimits }
              }
            };
          })
        })),

      stopNumberSales: (vendorId, draw, number) =>
        set((state) => ({
          vendors: state.vendors.map(v => {
            if (v.id !== vendorId) return v;
            const drawSettings = v.draws[draw as keyof typeof v.draws];
            const stoppedNumbers = drawSettings.stoppedNumbers || [];
            if (stoppedNumbers.includes(number)) return v;

            return {
              ...v,
              draws: {
                ...v.draws,
                [draw]: { ...drawSettings, stoppedNumbers: [...stoppedNumbers, number] }
              }
            };
          })
        })),

      resumeNumberSales: (vendorId, draw, number) =>
        set((state) => ({
          vendors: state.vendors.map(v => {
            if (v.id !== vendorId) return v;
            const drawSettings = v.draws[draw as keyof typeof v.draws];
            const stoppedNumbers = (drawSettings.stoppedNumbers || []).filter(n => n !== number);

            return {
              ...v,
              draws: {
                ...v.draws,
                [draw]: { ...drawSettings, stoppedNumbers }
              }
            };
          })
        })),

      updateNumberBetTotal: (vendorId, draw, number, amount) =>
        set((state) => ({
          vendors: state.vendors.map(v => {
            if (v.id !== vendorId) return v;
            const drawSettings = v.draws[draw as keyof typeof v.draws];
            const updatedLimits = (drawSettings.numberLimits || []).map(nl =>
              nl.number === number ? { ...nl, currentTotal: nl.currentTotal + amount } : nl
            );

            return {
              ...v,
              draws: {
                ...v.draws,
                [draw]: { ...drawSettings, numberLimits: updatedLimits }
              }
            };
          })
        })),

      getNumberLimit: (vendorId, draw, number) => {
        const state = get();
        const vendor = state.vendors.find(v => v.id === vendorId);
        if (!vendor) return undefined;

        const drawSettings = vendor.draws[draw as keyof typeof vendor.draws];
        return drawSettings.numberLimits?.find(nl => nl.number === number);
      },

      checkNumberLimitAvailable: (vendorId, draw, number, betAmount) => {
        const state = get();
        const vendor = state.vendors.find(v => v.id === vendorId);
        if (!vendor) return { allowed: false, remaining: 0, message: "Vendor not found" };

        const drawSettings = vendor.draws[draw as keyof typeof vendor.draws];
        const numberLimit = drawSettings.numberLimits?.find(nl => nl.number === number);

        if (!numberLimit) {
          // No limit set for this number, allow bet
          return { allowed: true, remaining: Infinity };
        }

        const remaining = numberLimit.limit - numberLimit.currentTotal;
        const allowed = betAmount <= remaining;

        return {
          allowed,
          remaining,
          message: allowed
            ? undefined
            : `Limite atteinte pour le numÃ©ro ${number}. Restant: $${remaining.toFixed(2)}`
        };
      },

      // Review management actions
      addVendorReview: (review) =>
        set((state) => ({ vendorReviews: [...state.vendorReviews, review] })),
      respondToReview: (reviewId, response) =>
        set((state) => ({
          vendorReviews: state.vendorReviews.map(review =>
            review.id === reviewId 
              ? { 
                  ...review, 
                  vendorResponse: { 
                    message: response, 
                    timestamp: Date.now() 
                  } 
                }
              : review
          )
        })),
      reportReview: (reviewId, reason) =>
        set((state) => ({
          vendorReviews: state.vendorReviews.map(review =>
            review.id === reviewId 
              ? { ...review, isReported: true, reportReason: reason }
              : review
          )
        })),
      hideReview: (reviewId) =>
        set((state) => ({
          vendorReviews: state.vendorReviews.map(review =>
            review.id === reviewId 
              ? { ...review, isVisible: false }
              : review
          )
        })),
      updateVendorProfile: (vendorId, profile) =>
        set((state) => ({
          vendors: state.vendors.map(v =>
            v.id === vendorId 
              ? { ...v, profile: { ...v.profile, ...profile } }
              : v
          )
        })),
      
      // Admin actions
      addVendor: (vendor) => 
        set((state) => ({ vendors: [...state.vendors, vendor] })),
      updateVendor: (vendorId, updates) =>
        set((state) => ({
          vendors: state.vendors.map(v => 
            v.id === vendorId ? { ...v, ...updates } : v
          )
        })),
      removeVendor: (vendorId) =>
        set((state) => ({
          vendors: state.vendors.filter(v => v.id !== vendorId)
        })),
      suspendVendor: (vendorId) =>
        set((state) => ({
          vendors: state.vendors.map(v =>
            v.id === vendorId ? { ...v, isActive: false } : v
          )
        })),
      activateVendor: (vendorId) =>
        set((state) => ({
          vendors: state.vendors.map(v =>
            v.id === vendorId ? { ...v, isActive: true, status: "active" as VendorStatus } : v
          )
        })),
      approveVendor: (vendorId) =>
        set((state) => {
          const pendingVendor = state.pendingVendors.find(v => v.id === vendorId);
          if (!pendingVendor) return state;
          
          const approvedVendor = { 
            ...pendingVendor, 
            status: "approved" as VendorStatus, 
            isActive: true, 
            approvedDate: Date.now() 
          };
          
          return {
            vendors: [...state.vendors, approvedVendor],
            pendingVendors: state.pendingVendors.filter(v => v.id !== vendorId)
          };
        }),
      rejectVendor: (vendorId, reason) =>
        set((state) => ({
          pendingVendors: state.pendingVendors.map(v =>
            v.id === vendorId ? { ...v, status: "rejected" as VendorStatus, notes: reason } : v
          )
        })),
      setPendingVendors: (vendors) => set({ pendingVendors: vendors }),
      resetVendorPassword: (vendorId) => {
        // In real app, this would trigger password reset email
        console.log(`Password reset initiated for vendor: ${vendorId}`);
      },
      sendVendorInvite: (email) => {
        // In real app, this would send invitation email
        console.log(`Invitation sent to: ${email}`);
      },
      setAllUsers: (users) => set({ allUsers: users }),
      updateAppSettings: (settings) =>
        set((state) => ({
          appSettings: { ...state.appSettings, ...settings }
        })),
      getSystemStats: () => {
        const state = get();
        const totalRevenue = state.gamePlays.reduce((sum, play) => sum + play.betAmount, 0);
        const today = new Date().toDateString();
        const todayGames = state.gamePlays.filter(play => 
          new Date(play.timestamp).toDateString() === today
        ).length;
        
        return {
          totalUsers: state.allUsers.length,
          activeVendors: state.vendors.filter(v => v.isActive).length,
          totalRevenue,
          todayGames,
          pendingApprovals: state.vendors.filter(v => !v.isActive).length
        };
      }
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        currency: state.currency,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        gamePlays: state.gamePlays,
        advertisements: state.advertisements,
        vendors: state.vendors,
        transactions: state.transactions,
      }),
      onRehydrateStorage: () => (state) => {
        // Ads are now fetched from the backend on mount — no local reinjection
      },
    }
  )
);
