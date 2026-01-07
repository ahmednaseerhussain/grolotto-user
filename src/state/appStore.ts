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
const createDefaultAdvertisements = () => [
  {
    id: "ad1",
    title: "🎯 GROLOTO",
    subtitle: "Win Big Today!",
    content: "Play your lucky numbers and win up to 50x your bet! Join thousands of winners.",
    backgroundColor: "#38bdf8",
    textColor: "#000000",
    linkUrl: "https://groloto.com/winnings",
    linkText: "See Winners",
    type: "slideshow" as const,
    status: "active" as const,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 2592000000,
    clicks: 1250,
    impressions: 15420,
    targetAudience: "all" as const,
    priority: "high" as const,
    order: 1
  },
  {
    id: "ad2",
    title: "📱 Live Results",
    subtitle: "Never Miss a Win",
    content: "Check winning numbers instantly. Results updated every hour with notifications!",
    backgroundColor: "#10b981",
    textColor: "#ffffff",
    linkUrl: "https://groloto.com/results",
    linkText: "View Results",
    type: "slideshow" as const,
    status: "active" as const,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 2592000000,
    clicks: 890,
    impressions: 12340,
    targetAudience: "active_players" as const,
    priority: "high" as const,
    order: 2
  },
  {
    id: "ad3",
    title: "🎁 New Player Bonus",
    subtitle: "20% Extra Credit",
    content: "Welcome! Get 20% bonus on your first deposit today. Limited time offer!",
    backgroundColor: "#f59e0b",
    textColor: "#000000",
    linkUrl: "https://groloto.com/signup-bonus",
    linkText: "Claim Bonus",
    type: "slideshow" as const,
    status: "active" as const,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 1296000000,
    clicks: 2140,
    impressions: 8760,
    targetAudience: "new_players" as const,
    priority: "high" as const,
    order: 3
  },
  {
    id: "ad4",
    title: "💰 Big Winners Club",
    subtitle: "Hall of Fame",
    content: "Join our winners! Last week: G50,000 jackpot winner from Port-au-Prince!",
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
    linkUrl: "https://groloto.com/winners",
    linkText: "See All Winners",
    type: "slideshow" as const,
    status: "active" as const,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 2592000000,
    clicks: 567,
    impressions: 9890,
    targetAudience: "all" as const,
    priority: "medium" as const,
    order: 4
  },
  {
    id: "ad5",
    title: "🏆 Weekend Special",
    subtitle: "Double Winnings",
    content: "Double your winnings on weekends! Play SENP and LOTO for maximum rewards.",
    backgroundColor: "#ef4444",
    textColor: "#ffffff",
    linkUrl: "https://groloto.com/promotions",
    linkText: "View Promotions",
    type: "slideshow" as const,
    status: "active" as const,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 1296000000,
    clicks: 778,
    impressions: 11200,
    targetAudience: "all" as const,
    priority: "medium" as const,
    order: 5
  }
];

export type Language = "ht" | "en" | "fr" | "es";
export type Currency = "USD" | "HTG";
export type UserRole = "player" | "vendor" | "admin";

// Payment system types
export type PaymentMethodType = "debit_card" | "moncash" | "natcash";
export type PayoutMethodType = "moncash" | "natcash" | "ach";
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
      language: "ht",
      currency: "HTG",
      hasCompletedOnboarding: true,
      user: {
        id: "admin1",
        email: "admin@groloto.com",
        name: "System Admin",
        role: "admin" as UserRole,
        isVerified: true,
        balance: 0,
        phone: "",
        country: "Haiti",
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      vendors: [
        // Demo vendors for testing
        {
          id: "vendor1",
          firstName: "Lucky",
          lastName: "Numbers",
          displayName: "Lucky Numbers GA",
          email: "lucky@groloto.com",
          phone: "555-0123",
          dateOfBirth: "1990-01-01",
          businessName: "Lucky Numbers GA",
          profile: {
            bio: "Professional lottery vendor serving the Atlanta area since 2020. We specialize in Georgia and New York state games with fast payouts and excellent customer service.",
            location: "Atlanta, GA",
            businessHours: "Mon-Sat 8AM-8PM, Sun 10AM-6PM",
            specialties: ["Georgia Lottery", "New York Lottery", "Fast Payouts", "Customer Service"],
            socialMedia: {
              website: "https://luckynumbersga.com",
              facebook: "LuckyNumbersGA",
            }
          },
          status: "approved" as VendorStatus,
          applicationDate: Date.now() - 86400000,
          approvedDate: Date.now() - 43200000,
          documents: [],
          draws: {
            NY: { enabled: true, games: { senp: { enabled: true, minAmount: 1, maxAmount: 75 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 25 }, loto3: { enabled: true, minAmount: 3, maxAmount: 150 }, loto4: { enabled: false, minAmount: 5, maxAmount: 300 }, loto5: { enabled: true, minAmount: 10, maxAmount: 800 } } },
            FL: createDefaultDrawSettings(),
            GA: { enabled: true, games: { senp: { enabled: true, minAmount: 5, maxAmount: 100 }, maryaj: { enabled: true, minAmount: 2, maxAmount: 50 }, loto3: { enabled: true, minAmount: 5, maxAmount: 200 }, loto4: { enabled: true, minAmount: 10, maxAmount: 500 }, loto5: { enabled: true, minAmount: 15, maxAmount: 1000 } } },
            TX: createDefaultDrawSettings(),
            PA: createDefaultDrawSettings(),
            CT: createDefaultDrawSettings(),
            TN: createDefaultDrawSettings(),
            NJ: createDefaultDrawSettings()
          },
          totalRevenue: 15000,
          availableBalance: 2500,
          totalPlayers: 45,
          rating: 4.8,
          totalTicketsSold: 230,
          lastLogin: Date.now() - 3600000,
          isActive: true,
        },
        {
          id: "vendor2",
          firstName: "Big Win",
          lastName: "Florida",
          displayName: "Big Win Florida",
          email: "bigwin@groloto.com",
          phone: "555-0456",
          dateOfBirth: "1985-05-15",
          businessName: "Big Win Florida",
          status: "approved" as VendorStatus,
          applicationDate: Date.now() - 172800000,
          approvedDate: Date.now() - 86400000,
          documents: [],
          draws: {
            NY: createDefaultDrawSettings(),
            FL: { enabled: true, games: { senp: { enabled: true, minAmount: 1, maxAmount: 75 }, maryaj: { enabled: true, minAmount: 1, maxAmount: 30 }, loto3: { enabled: true, minAmount: 3, maxAmount: 150 }, loto4: { enabled: true, minAmount: 5, maxAmount: 200 }, loto5: { enabled: true, minAmount: 10, maxAmount: 500 } } },
            GA: createDefaultDrawSettings(),
            TX: createDefaultDrawSettings(),
            PA: createDefaultDrawSettings(),
            CT: createDefaultDrawSettings(),
            TN: createDefaultDrawSettings(),
            NJ: createDefaultDrawSettings()
          },
          totalRevenue: 8500,
          availableBalance: 1200,
          totalPlayers: 28,
          rating: 4.2,
          totalTicketsSold: 158,
          lastLogin: Date.now() - 7200000,
          isActive: true,
        }
      ],
      pendingVendors: [],
      selectedVendor: null,
      gamePlays: [
        // Demo game plays for testing VendorPlayHistory
        {
          id: "game1",
          playerId: "player1",
          vendorId: "vendor1",
          draw: "NY",
          gameType: "senp",
          numbers: [12, 25],
          betAmount: 15,
          currency: "USD",
          timestamp: Date.now() - 3600000, // 1 hour ago
          status: "won",
          winAmount: 450,
        },
        {
          id: "game2",
          playerId: "player2",
          vendorId: "vendor1",
          draw: "FL",
          gameType: "maryaj",
          numbers: [58, 69],
          betAmount: 25,
          currency: "USD",
          timestamp: Date.now() - 7200000, // 2 hours ago
          status: "pending",
        },
        {
          id: "game3",
          playerId: "player3",
          vendorId: "vendor1",
          draw: "GA",
          gameType: "loto3",
          numbers: [123, 456, 789],
          betAmount: 10,
          currency: "USD",
          timestamp: Date.now() - 86400000, // 1 day ago
          status: "lost",
        },
        {
          id: "game4",
          playerId: "player1",
          vendorId: "vendor1",
          draw: "NY",
          gameType: "senp",
          numbers: [58],
          betAmount: 36,
          currency: "USD",
          timestamp: Date.now() - 172800000, // 2 days ago
          status: "pending",
        },
        {
          id: "game5",
          playerId: "player4",
          vendorId: "vendor1",
          draw: "TX",
          gameType: "loto5",
          numbers: [11, 22, 33, 44, 55],
          betAmount: 50,
          currency: "USD",
          timestamp: Date.now() - 259200000, // 3 days ago
          status: "won",
          winAmount: 1250,
        },
        {
          id: "game6",
          playerId: "player2",
          vendorId: "vendor1",
          draw: "FL",
          gameType: "maryaj",
          numbers: [7, 14],
          betAmount: 20,
          currency: "USD",
          timestamp: Date.now() - 345600000, // 4 days ago
          status: "lost",
        },
        {
          id: "game7",
          playerId: "player3",
          vendorId: "vendor1",
          draw: "GA",
          gameType: "senp",
          numbers: [99],
          betAmount: 40,
          currency: "USD",
          timestamp: Date.now() - 604800000, // 1 week ago
          status: "won",
          winAmount: 800,
        },
        {
          id: "game8",
          playerId: "player5",
          vendorId: "vendor1",
          draw: "NY",
          gameType: "loto4",
          numbers: [1234, 5678],
          betAmount: 30,
          currency: "USD",
          timestamp: Date.now() - 1209600000, // 2 weeks ago
          status: "lost",
        },
        {
          id: "game9",
          playerId: "player1",
          vendorId: "vendor1",
          draw: "TX",
          gameType: "loto3",
          numbers: [777, 888, 999],
          betAmount: 15,
          currency: "USD",
          timestamp: Date.now() - 1814400000, // 3 weeks ago
          status: "pending",
        },
        {
          id: "game10",
          playerId: "player6",
          vendorId: "vendor1",
          draw: "FL",
          gameType: "senp",
          numbers: [42],
          betAmount: 25,
          currency: "USD",
          timestamp: Date.now() - 2419200000, // 1 month ago
          status: "won",
          winAmount: 375,
        },
      ],
      advertisements: createDefaultAdvertisements(),
      payouts: [],
      vendorNotifications: [],
      vendorReviews: [
        // Demo reviews for Lucky Numbers GA
        {
          id: "review1",
          vendorId: "vendor1",
          playerId: "player1",
          playerName: "themepam89",
          rating: 5,
          comment: "Great vendor! Fast payouts and always available. Won big on Georgia Senp!",
          timestamp: Date.now() - 86400000,
          gamePlay: {
            gameType: "SENP",
            draw: "GA",
            betAmount: 25
          },
          isReported: false,
          isVisible: true
        },
        {
          id: "review2", 
          vendorId: "vendor1",
          playerId: "player2",
          playerName: "player123",
          rating: 4,
          comment: "Good service, but sometimes takes a while to respond. Overall happy with the experience.",
          timestamp: Date.now() - 172800000,
          gamePlay: {
            gameType: "MARYAJ",
            draw: "GA", 
            betAmount: 15
          },
          vendorResponse: {
            message: "Thank you for the feedback! We're working to improve response times. Appreciate your business!",
            timestamp: Date.now() - 86400000
          },
          isReported: false,
          isVisible: true
        },
        {
          id: "review3",
          vendorId: "vendor1", 
          playerId: "player3",
          playerName: "luckyplayer",
          rating: 5,
          comment: "Best vendor in Atlanta! Fair prices and excellent customer service. Highly recommend!",
          timestamp: Date.now() - 259200000,
          gamePlay: {
            gameType: "LOTO3",
            draw: "GA",
            betAmount: 50
          },
          isReported: false,
          isVisible: true
        },
        {
          id: "review4",
          vendorId: "vendor2",
          playerId: "player1", 
          playerName: "themepam89",
          rating: 3,
          comment: "Okay experience. Pricing is good but location is hard to find.",
          timestamp: Date.now() - 345600000,
          gamePlay: {
            gameType: "SENP",
            draw: "FL",
            betAmount: 10
          },
          isReported: false,
          isVisible: true
        }
      ],
      allUsers: [
        {
          id: "player1",
          email: "themepam89@groloto.com",
          name: "themepam89",
          role: "player" as UserRole,
          isVerified: true,
          phone: "+509 3456-7890",
          country: "Haiti",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "vendor1", 
          email: "lucky@groloto.com",
          name: "Lucky Numbers",
          role: "vendor" as UserRole,
          isVerified: true,
          phone: "+509 1234-5678",
          country: "Haiti",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: "vendor2",
          email: "bigwin@groloto.com", 
          name: "Big Win Florida",
          role: "vendor" as UserRole,
          isVerified: true,
          phone: "+1 555-0456",
          country: "United States",
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: "admin1",
          email: "admin@groloto.com",
          name: "Admin",
          role: "admin" as UserRole,
          isVerified: true,
          phone: "+509 0000-0000",
          country: "Haiti",
          createdAt: new Date(Date.now() - 345600000).toISOString(),
        }
      ],
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
            : `Limite atteinte pour le numéro ${number}. Restant: $${remaining.toFixed(2)}`
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
        // If advertisements array is empty after rehydration, reinitialize with defaults
        if (state && state.advertisements.length === 0) {
          state.advertisements = createDefaultAdvertisements();
        }
      },
    }
  )
);