/**
 * EXAMPLE: Using Firebase Service in External Admin Panel
 * 
 * Copy this code to your external admin project to control GROLOTTO app
 */

import { 
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  subscribeToAdvertisements,
  getAdvertisements,
  createDraw,
  getDraws,
  updateDraw,
  getUsersByRole,
  updateUser,
  getAllBets,
  getGameSettings,
  updateGameSettings
} from "./firebase-service";

// ========================================
// ADVERTISEMENT MANAGEMENT
// ========================================

export class AdminAdvertisementController {
  
  // Create new advertisement
  static async createAd(adData: {
    title: string;
    description: string;
    imageUrl: string;
    targetAudience: string;
    startDate: string;
    endDate: string;
  }) {
    const newAd = {
      id: `ad-${Date.now()}`,
      ...adData,
      status: "active",
      impressions: 0,
      clicks: 0,
      createdBy: "admin",
    };
    
    await createAdvertisement(newAd);
    console.log("✅ Ad created - GROLOTTO app will show it instantly!");
    return newAd;
  }
  
  // Update existing advertisement
  static async updateAd(adId: string, updates: any) {
    await updateAdvertisement(adId, updates);
    console.log("✅ Ad updated - Changes live in GROLOTTO app!");
  }
  
  // Pause advertisement
  static async pauseAd(adId: string) {
    await updateAdvertisement(adId, { status: "paused" });
    console.log("⏸️ Ad paused - Hidden from GROLOTTO app!");
  }
  
  // Delete advertisement
  static async deleteAd(adId: string) {
    await deleteAdvertisement(adId);
    console.log("🗑️ Ad deleted - Removed from GROLOTTO app!");
  }
  
  // Get all advertisements
  static async getAllAds() {
    const ads = await getAdvertisements();
    console.log(`📢 Total ads: ${ads.length}`);
    return ads;
  }
  
  // Listen to real-time changes
  static listenToAds(callback: (ads: any[]) => void) {
    const unsubscribe = subscribeToAdvertisements((ads) => {
      console.log("🔴 LIVE: Ads updated", ads.length);
      callback(ads);
    });
    return unsubscribe;
  }
}

// ========================================
// DRAW/RESULTS MANAGEMENT
// ========================================

export class AdminDrawController {
  
  // Publish lottery results
  static async publishResults(resultData: {
    state: string;
    drawType: "midday" | "evening";
    winningNumbers: number[];
    jackpot: number;
  }) {
    const draw = {
      id: `draw-${Date.now()}`,
      drawId: `${resultData.state.toUpperCase()}-${resultData.drawType.toUpperCase()}-${new Date().toISOString().split('T')[0]}`,
      ...resultData,
      date: new Date().toISOString(),
      drawTime: resultData.drawType === "midday" ? "12:00 PM" : "7:00 PM",
      status: "published",
      createdBy: "admin",
    };
    
    await createDraw(draw);
    console.log("🏆 Results published - Players see them NOW!");
    return draw;
  }
  
  // Get all draws
  static async getAllDraws() {
    const draws = await getDraws();
    console.log(`🎲 Total draws: ${draws.length}`);
    return draws;
  }
  
  // Update draw (e.g., fix typo)
  static async updateDraw(drawId: string, updates: any) {
    await updateDraw(drawId, updates);
    console.log("✅ Draw updated!");
  }
}

// ========================================
// PLAYER MANAGEMENT
// ========================================

export class AdminPlayerController {
  
  // Get all players
  static async getAllPlayers() {
    const players = await getUsersByRole("player");
    console.log(`👥 Total players: ${players.length}`);
    return players;
  }
  
  // Suspend player
  static async suspendPlayer(playerId: string, reason: string) {
    await updateUser(playerId, {
      status: "suspended",
      suspendedReason: reason,
      suspendedAt: new Date().toISOString(),
    });
    console.log(`🚫 Player ${playerId} suspended - Can't place bets!`);
  }
  
  // Activate player
  static async activatePlayer(playerId: string) {
    await updateUser(playerId, {
      status: "active",
      suspendedReason: null,
      suspendedAt: null,
    });
    console.log(`✅ Player ${playerId} activated - Can play again!`);
  }
  
  // Update player balance (after payout)
  static async updatePlayerBalance(playerId: string, newBalance: number) {
    await updateUser(playerId, { balance: newBalance });
    console.log(`💰 Player ${playerId} balance updated to $${newBalance}`);
  }
}

// ========================================
// VENDOR MANAGEMENT
// ========================================

export class AdminVendorController {
  
  // Get all vendors
  static async getAllVendors() {
    const vendors = await getUsersByRole("vendor");
    console.log(`🏪 Total vendors: ${vendors.length}`);
    return vendors;
  }
  
  // Approve vendor
  static async approveVendor(vendorId: string) {
    await updateUser(vendorId, {
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
    console.log(`✅ Vendor ${vendorId} approved - Can sell tickets!`);
  }
  
  // Process payout to vendor
  static async processVendorPayout(vendorId: string, amount: number) {
    await updateUser(vendorId, {
      lastPayoutAmount: amount,
      lastPayoutDate: new Date().toISOString(),
    });
    console.log(`💸 Payout of $${amount} processed for vendor ${vendorId}`);
  }
}

// ========================================
// GAME SETTINGS
// ========================================

export class AdminSettingsController {
  
  // Get current settings
  static async getSettings() {
    const settings = await getGameSettings();
    console.log("⚙️ Current settings:", settings);
    return settings;
  }
  
  // Update bet limits
  static async updateBetLimits(limits: { minBet: number; maxBet: number }) {
    await updateGameSettings({
      betLimits: limits,
    });
    console.log(`⚙️ Bet limits updated - Min: $${limits.minBet}, Max: $${limits.maxBet}`);
  }
  
  // Toggle game availability
  static async toggleGame(gameId: string, enabled: boolean) {
    const settings = await getGameSettings();
    const games = settings?.games || {};
    games[gameId] = { ...games[gameId], enabled };
    
    await updateGameSettings({ games });
    console.log(`⚙️ Game ${gameId} ${enabled ? "enabled" : "disabled"}`);
  }
}

// ========================================
// ANALYTICS
// ========================================

export class AdminAnalyticsController {
  
  // Get system statistics
  static async getSystemStats() {
    const [players, vendors, bets] = await Promise.all([
      getUsersByRole("player"),
      getUsersByRole("vendor"),
      getAllBets(),
    ]);
    
    const totalRevenue = bets.reduce((sum, bet: any) => sum + (bet.amount || 0), 0);
    
    const stats = {
      totalPlayers: players.length,
      totalVendors: vendors.length,
      totalBets: bets.length,
      totalRevenue,
    };
    
    console.log("📊 System Stats:", stats);
    return stats;
  }
}

// ========================================
// USAGE EXAMPLES IN YOUR ADMIN UI
// ========================================

/**
 * Example 1: Admin Dashboard Component
 */
export async function AdminDashboardExample() {
  // Get live stats
  const stats = await AdminAnalyticsController.getSystemStats();
  
  // Listen to advertisements in real-time
  const unsubscribe = AdminAdvertisementController.listenToAds((ads) => {
    console.log("Updated ads:", ads);
    // Update your UI with new ads
  });
  
  // Clean up listener when component unmounts
  return () => unsubscribe();
}

/**
 * Example 2: Create Advertisement Form
 */
export async function createAdExample() {
  await AdminAdvertisementController.createAd({
    title: "Mega Jackpot Tonight!",
    description: "Win $1,000,000 - Play now!",
    imageUrl: "https://example.com/jackpot.jpg",
    targetAudience: "all",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Example 3: Publish Lottery Results
 */
export async function publishResultsExample() {
  await AdminDrawController.publishResults({
    state: "Georgia",
    drawType: "midday",
    winningNumbers: [7, 13, 21, 34, 45],
    jackpot: 50000,
  });
}

/**
 * Example 4: Manage Player
 */
export async function managePlayerExample() {
  const players = await AdminPlayerController.getAllPlayers();
  
  // Suspend suspicious player
  await AdminPlayerController.suspendPlayer(
    players[0].id, 
    "Multiple failed login attempts"
  );
  
  // Later, activate them again
  await AdminPlayerController.activatePlayer(players[0].id);
}

/**
 * Example 5: Update Game Settings
 */
export async function updateSettingsExample() {
  // Change bet limits
  await AdminSettingsController.updateBetLimits({
    minBet: 1,
    maxBet: 1000,
  });
  
  // Disable a game temporarily
  await AdminSettingsController.toggleGame("georgia-midday", false);
}
