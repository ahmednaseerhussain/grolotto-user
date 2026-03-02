import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Configuration ───────────────────────────────────────
// Android emulator uses 10.0.2.2 to reach host machine; iOS simulator uses localhost
const getBaseUrl = () => {
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'https://grolotto-user-wk3b.onrender.com/api'
      : 'https://grolotto-user-wk3b.onrender.com/api';
  }
  return 'https://grolotto-user-wk3b.onrender.com/api';
};

const TOKEN_KEY = 'groloto_access_token';
const REFRESH_KEY = 'groloto_refresh_token';

// ─── Axios instance ──────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token helpers ───────────────────────────────────────
export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async setTokens(access: string, refresh: string): Promise<void> {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, access],
      [REFRESH_KEY, refresh],
    ]);
  },
  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
  },
};

// ─── Request interceptor: attach access token ────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: auto-refresh on 401 ──────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${getBaseUrl()}/auth/refresh`, {
          refreshToken,
        });

        await tokenStorage.setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.clearTokens();
        // The store will detect no token and reset auth state
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Error extraction helper ─────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.response?.data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

// ═════════════════════════════════════════════════════════
//  AUTH API
// ═════════════════════════════════════════════════════════
export const authAPI = {
  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: 'player' | 'vendor';
    phone?: string;
    dateOfBirth: string;
  }) {
    const res = await api.post('/auth/register', data);
    const { user, tokens } = res.data;
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  },

  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = res.data;
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  },

  async logout() {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore logout errors
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  async getProfile() {
    const res = await api.get('/auth/profile');
    return res.data;
  },

  async updateProfile(data: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    country?: string;
  }) {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  VENDOR API
// ═════════════════════════════════════════════════════════
export const vendorAPI = {
  async getActiveVendors() {
    const res = await api.get('/vendors');
    return res.data;
  },

  async getVendorById(id: string) {
    const res = await api.get(`/vendors/${id}`);
    return res.data;
  },

  async getMyVendorProfile() {
    const res = await api.get('/vendors/me');
    return res.data;
  },

  async getMyVendorStats() {
    const res = await api.get('/vendors/me/stats');
    return res.data;
  },

  async getPlayHistory(page = 1, limit = 20) {
    const res = await api.get('/vendors/me/history', { params: { page, limit } });
    return res.data;
  },

  async updateDrawSettings(drawState: string, settings: object) {
    const res = await api.put(`/vendors/draws/${drawState}`, settings);
    return res.data;
  },

  async registerVendor(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    businessName?: string;
  }) {
    const res = await api.post('/vendors/register', data);
    return res.data;
  },

  async getReviews(vendorId: string) {
    const res = await api.get(`/vendors/${vendorId}/reviews`);
    return res.data;
  },

  async getNumberLimits() {
    const res = await api.get('/vendors/me/number-limits');
    return res.data;
  },

  async createNumberLimit(data: { drawState: string; number: string; betLimit: number }) {
    const res = await api.post('/vendors/me/number-limits', data);
    return res.data;
  },

  async updateNumberLimit(limitId: string, data: { betLimit?: number; isStopped?: boolean }) {
    const res = await api.put(`/vendors/me/number-limits/${limitId}`, data);
    return res.data;
  },

  async deleteNumberLimit(limitId: string) {
    const res = await api.delete(`/vendors/me/number-limits/${limitId}`);
    return res.data;
  },

  async requestPayout(data: { amount: number; method: string; currency: string }) {
    const res = await api.post('/vendors/me/payouts', data);
    return res.data;
  },

  // ─── Vendor Lottery Round Management ─────────────────
  async getMyRounds(filters?: { status?: string; date?: string; page?: number; limit?: number }) {
    const res = await api.get('/vendors/me/rounds', { params: filters });
    return res.data;
  },

  async getMyRoundDetails(roundId: string) {
    const res = await api.get(`/vendors/me/rounds/${roundId}`);
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  LOTTERY API
// ═════════════════════════════════════════════════════════
export const lotteryAPI = {
  async placeBet(data: {
    vendorId: string;
    drawState: string;
    gameType: string;
    numbers: number[];
    betAmount: number;
    currency?: string;
  }) {
    const res = await api.post('/lottery/bet', data);
    return res.data;
  },

  async getMyTickets(page = 1, limit = 20, status?: string) {
    const res = await api.get('/lottery/tickets', {
      params: { page, limit, status },
    });
    return res.data;
  },

  async getLotteryRounds(drawState?: string, date?: string) {
    const res = await api.get('/lottery/rounds', {
      params: { drawState, date },
    });
    return res.data;
  },

  // Admin only — publishes results globally per state per day
  async publishResults(drawState: string, winningNumbers: Record<string, number[]>, drawDate?: string) {
    const res = await api.post('/lottery/results', { drawState, winningNumbers, drawDate });
    return res.data;
  },

  async generateRandomNumbers() {
    const res = await api.get('/lottery/random-numbers');
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  WALLET API
// ═════════════════════════════════════════════════════════
export const walletAPI = {
  async getWallet() {
    const res = await api.get('/wallet');
    return res.data;
  },

  async getTransactions(page = 1, limit = 20, type?: string) {
    const res = await api.get('/wallet/transactions', {
      params: { page, limit, type },
    });
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  PAYMENT API (MonCash)
// ═════════════════════════════════════════════════════════
export const paymentAPI = {
  async createPaymentIntent(amount: number, currency = 'USD') {
    const res = await api.post('/payments/intent', { amount, currency });
    return res.data;
  },

  async verifyPayment(orderId: string, transactionId?: string) {
    const res = await api.post('/payments/verify', { orderId, transactionId });
    return res.data;
  },

  async getTransactionStatus(transactionId: string) {
    const res = await api.get(`/payments/status/${transactionId}`);
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  ADMIN API
// ═════════════════════════════════════════════════════════
export const adminAPI = {
  async getSystemStats() {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  async getAllUsers(page = 1, limit = 50, role?: string) {
    const res = await api.get('/admin/users', { params: { page, limit, role } });
    return res.data;
  },

  async suspendUser(userId: string) {
    const res = await api.put(`/admin/users/${userId}/suspend`);
    return res.data;
  },

  async activateUser(userId: string) {
    const res = await api.put(`/admin/users/${userId}/activate`);
    return res.data;
  },

  async approveVendor(vendorId: string) {
    const res = await api.put(`/admin/vendors/${vendorId}/approve`);
    return res.data;
  },

  async rejectVendor(vendorId: string) {
    const res = await api.put(`/admin/vendors/${vendorId}/reject`);
    return res.data;
  },

  async suspendVendor(vendorId: string) {
    const res = await api.put(`/admin/vendors/${vendorId}/suspend`);
    return res.data;
  },

  async activateVendor(vendorId: string) {
    const res = await api.put(`/admin/vendors/${vendorId}/activate`);
    return res.data;
  },

  async getAppSettings() {
    const res = await api.get('/admin/settings');
    return res.data;
  },

  async updateAppSetting(key: string, value: string) {
    const res = await api.put(`/admin/settings/${key}`, { value });
    return res.data;
  },

  async getPendingPayouts() {
    const res = await api.get('/admin/payouts/pending');
    return res.data;
  },

  async processVendorPayout(payoutId: string, data: { action: 'approved' | 'rejected'; notes?: string; transferReference?: string }) {
    const res = await api.post(`/admin/payouts/${payoutId}/process`, data);
    return res.data;
  },

  // Advertisements
  async getAdvertisements() {
    const res = await api.get('/admin/advertisements');
    return res.data;
  },

  async createAdvertisement(data: object) {
    const res = await api.post('/admin/advertisements', data);
    return res.data;
  },

  async updateAdvertisement(adId: string, data: object) {
    const res = await api.put(`/admin/advertisements/${adId}`, data);
    return res.data;
  },

  async deleteAdvertisement(adId: string) {
    const res = await api.delete(`/admin/advertisements/${adId}`);
    return res.data;
  },

  async recordAdClick(adId: string) {
    const res = await api.post(`/admin/advertisements/${adId}/click`);
    return res.data;
  },

  async recordAdImpression(adId: string) {
    const res = await api.post(`/admin/advertisements/${adId}/impression`);
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  TCHALA API (Dream Dictionary)
// ═════════════════════════════════════════════════════════
export const tchalaAPI = {
  async searchDreams(query: string, language = 'en') {
    const res = await api.get('/tchala/search', { params: { q: query, language } });
    return res.data;
  },

  async getAllDreams(language = 'en') {
    const res = await api.get('/tchala/all', { params: { language } });
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  REWARDS API
// ═════════════════════════════════════════════════════════
export const rewardsAPI = {
  async getRewards() {
    const res = await api.get('/rewards');
    return res.data;
  },

  async claimReward(rewardId: string) {
    const res = await api.post(`/rewards/${rewardId}/claim`);
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  NOTIFICATIONS API
// ═════════════════════════════════════════════════════════
export const notificationsAPI = {
  async getNotifications(limit = 50, offset = 0) {
    const res = await api.get('/notifications', { params: { limit, offset } });
    return res.data;
  },

  async getUnreadCount() {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(notificationId: string) {
    const res = await api.put(`/notifications/${notificationId}/read`);
    return res.data;
  },

  async markAllAsRead() {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  SETTINGS API (Public)
// ═════════════════════════════════════════════════════════
export const settingsAPI = {
  async getPublicSettings() {
    const res = await api.get('/settings/public');
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  ADVERTISEMENT API (Public)
// ═════════════════════════════════════════════════════════
export const advertisementAPI = {
  async getActiveAds() {
    const res = await api.get('/advertisements/active');
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════
//  GIFT CARD API
// ═════════════════════════════════════════════════════════
export const giftCardAPI = {
  async purchase(data: { amount: number; currency: string; recipientName?: string; message?: string }) {
    const res = await api.post('/gift-cards/purchase', data);
    return res.data;
  },

  async redeem(code: string) {
    const res = await api.post('/gift-cards/redeem', { code });
    return res.data;
  },

  async getMyCards() {
    const res = await api.get('/gift-cards/my-cards');
    return res.data;
  },
};

export default api;
