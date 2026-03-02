// ── Types ported from React Native app ──

export type Language = "ht" | "en" | "fr" | "es";
export type Currency = "USD" | "HTG";
export type UserRole = "player" | "vendor" | "admin";
export type VendorStatus = "pending" | "approved" | "rejected" | "suspended" | "active";
export type PayoutStatus = "pending" | "approved" | "rejected" | "paid";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type TransactionType = "bet_payment" | "winning_payout" | "deposit" | "withdrawal" | "commission";
export type GameType = "senp" | "maryaj" | "loto3" | "loto4" | "loto5";
export type DrawState = "NY" | "FL" | "GA" | "TX" | "PA" | "CT" | "TN" | "NJ";
export type TicketStatus = "pending" | "won" | "lost";
export type AdType = "slideshow" | "banner" | "popup";
export type AdStatus = "active" | "paused" | "scheduled" | "expired";

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  balance?: number;
  balanceUsd?: number;
  balanceHtg?: number;
  isVerified?: boolean;
  isActive?: boolean;
  paymentMethods?: PaymentMethod[];
  payoutMethods?: PayoutMethod[];
  createdAt?: string;
}

export interface PaymentMethod {
  id: string;
  type: "moncash";
  displayName: string;
  phoneNumber: string;
  lastFourDigits?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface PayoutMethod {
  id: string;
  type: "moncash";
  displayName: string;
  phoneNumber?: string;
  accountNumber?: string;
  bankName?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Vendor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  businessName?: string;
  email: string;
  phone?: string;
  status: VendorStatus;
  bio?: string;
  location?: string;
  commissionRate: number;
  totalRevenue: number;
  availableBalance: number;
  rating: number;
  totalTicketsSold: number;
  draws: DrawConfig[] | Record<string, unknown>;
  documents?: VendorDocument[];
  profile?: VendorProfile;
  createdAt?: string;
}

export interface VendorProfile {
  businessHours?: string;
  socialMedia?: {
    facebook?: string;
    whatsapp?: string;
    instagram?: string;
  };
}

export interface VendorDocument {
  id: string;
  type: "id_card" | "business_license";
  fileUrl?: string;
  verified: boolean;
}

export interface DrawConfig {
  id?: string;
  drawState: DrawState;
  enabled: boolean;
  games: GameConfig[];
}

export interface GameConfig {
  gameType: GameType;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
}

export interface NumberLimit {
  id: string;
  vendorId: string;
  drawState: DrawState;
  number: string;
  betLimit: number;
  currentTotal: number;
  isStopped: boolean;
  drawDate?: string;
}

export interface LotteryRound {
  id: string;
  drawState: DrawState;
  drawDate: string;
  drawTime?: string;
  status: "open" | "closed" | "drawing" | "completed";
  winningNumbers?: Record<string, number[]>;
  totalBets: number;
  totalPayouts: number;
  totalTickets: number;
  vendorId?: string;
  prizePool?: number;
  winnerCount?: number;
}

export interface LotteryTicket {
  id: string;
  playerId: string;
  vendorId: string;
  roundId: string;
  drawState: DrawState;
  gameType: GameType;
  numbers: number[];
  betAmount: number;
  currency: Currency;
  status: TicketStatus;
  winAmount?: number;
  winMultiplier?: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  paymentMethod?: string;
  status: PaymentStatus;
  description?: string;
  ticketId?: string;
  vendorId?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  method: string;
  status: PayoutStatus;
  processedDate?: string;
  processedBy?: string;
  notes?: string;
  currency: Currency;
  createdAt: string;
}

export interface VendorReview {
  id: string;
  vendorId: string;
  playerId: string;
  playerName: string;
  rating: number;
  comment: string;
  timestamp: number;
  vendorResponse?: string;
  isReported: boolean;
  isVisible: boolean;
}

export interface Advertisement {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  linkUrl?: string;
  adType: AdType;
  status: AdStatus;
  startDate?: string;
  endDate?: string;
  clicks: number;
  impressions: number;
  targetAudience?: string;
  priority?: string;
  displayOrder?: number;
}

export interface Reward {
  id: string;
  userId: string;
  type: "welcome_bonus" | "daily_spin" | "first_deposit" | "referral" | "loyalty";
  title: string;
  description: string;
  amount: number;
  currency: Currency;
  status: "available" | "claimed" | "expired";
  expiresAt?: string;
  claimedAt?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  vendorId?: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VendorStats {
  [key: string]: number | string | boolean | null | undefined;
  totalRevenue: number;
  todayRevenue: number;
  totalPlays: number;
  todayPlays: number;
  totalPlayers: number;
  todayPlayers: number;
  totalWinners: number;
  todayWinners: number;
  rating: number;
  availableBalance: number;
  activePlayers?: number;
  activePlayersCount?: number;
  ticketsToday?: number;
  weeklyEarnings?: number;
  totalEarnings?: number;
  todayBets?: number;
  enabledGames?: number;
  balance?: number;
  totalTicketsSold?: number;
  earningsToday?: number;
}

export interface AppSettings {
  maintenanceMode?: boolean;
  registrationEnabled?: boolean;
  minBetAmount?: number;
  maxBetAmount?: number;
  commissionRate?: number;
  allowedStates?: DrawState[];
  gameAvailability?: Record<GameType, boolean>;
  winMultipliers?: Record<GameType, number>;
  exchangeRate?: number;
}

export interface WalletBalance {
  balance?: number;
  balanceUsd: number;
  balanceHtg: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalWon: number;
  totalBet: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
