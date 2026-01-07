import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase-config";

/**
 * Firebase Backend Service for GROLOTTO
 * 
 * This service allows your external admin panel to control the GROLOTTO app.
 * All data syncs in real-time between admin and app.
 */

// ========================================
// USERS (Players, Vendors, Admins)
// ========================================

export const usersCollection = collection(db, "users");

export const createUser = async (userData: any) => {
  const userRef = doc(usersCollection, userData.id);
  await setDoc(userRef, {
    ...userData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return userData;
};

export const getUser = async (userId: string) => {
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export const updateUser = async (userId: string, updates: any) => {
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const getAllUsers = async () => {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUsersByRole = async (role: "player" | "vendor" | "admin") => {
  const q = query(usersCollection, where("role", "==", role));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ========================================
// DRAWS (Lottery Draws)
// ========================================

export const drawsCollection = collection(db, "draws");

export const createDraw = async (drawData: any) => {
  const drawRef = doc(drawsCollection, drawData.id);
  await setDoc(drawRef, {
    ...drawData,
    createdAt: Timestamp.now(),
  });
  return drawData;
};

export const getDraws = async () => {
  const snapshot = await getDocs(drawsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateDraw = async (drawId: string, updates: any) => {
  const drawRef = doc(drawsCollection, drawId);
  await updateDoc(drawRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// ========================================
// ADVERTISEMENTS
// ========================================

export const adsCollection = collection(db, "advertisements");

export const createAdvertisement = async (adData: any) => {
  const adRef = doc(adsCollection, adData.id);
  await setDoc(adRef, {
    ...adData,
    createdAt: Timestamp.now(),
  });
  return adData;
};

export const getAdvertisements = async () => {
  const snapshot = await getDocs(adsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAdvertisement = async (adId: string, updates: any) => {
  const adRef = doc(adsCollection, adId);
  await updateDoc(adRef, updates);
};

export const deleteAdvertisement = async (adId: string) => {
  const adRef = doc(adsCollection, adId);
  await deleteDoc(adRef);
};

// ========================================
// BETS (Player Bets)
// ========================================

export const betsCollection = collection(db, "bets");

export const createBet = async (betData: any) => {
  const betRef = doc(betsCollection, betData.id);
  await setDoc(betRef, {
    ...betData,
    createdAt: Timestamp.now(),
  });
  return betData;
};

export const getBetsByPlayer = async (playerId: string) => {
  const q = query(betsCollection, where("playerId", "==", playerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBetsByVendor = async (vendorId: string) => {
  const q = query(betsCollection, where("vendorId", "==", vendorId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllBets = async () => {
  const snapshot = await getDocs(betsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ========================================
// TRANSACTIONS (Payments, Payouts)
// ========================================

export const transactionsCollection = collection(db, "transactions");

export const createTransaction = async (txData: any) => {
  const txRef = doc(transactionsCollection, txData.id);
  await setDoc(txRef, {
    ...txData,
    createdAt: Timestamp.now(),
  });
  return txData;
};

export const getTransactionsByUser = async (userId: string) => {
  const q = query(transactionsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllTransactions = async () => {
  const snapshot = await getDocs(transactionsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ========================================
// REAL-TIME LISTENERS
// ========================================

/**
 * Subscribe to real-time updates for a collection
 * Perfect for admin panels that need live data
 */

export const subscribeToAdvertisements = (callback: (ads: any[]) => void) => {
  return onSnapshot(adsCollection, (snapshot) => {
    const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(ads);
  });
};

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  return onSnapshot(usersCollection, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(users);
  });
};

export const subscribeToDraws = (callback: (draws: any[]) => void) => {
  return onSnapshot(drawsCollection, (snapshot) => {
    const draws = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(draws);
  });
};

export const subscribeToBets = (callback: (bets: any[]) => void) => {
  return onSnapshot(betsCollection, (snapshot) => {
    const bets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(bets);
  });
};

// ========================================
// GAME SETTINGS
// ========================================

export const settingsDoc = doc(db, "settings", "global");

export const getGameSettings = async () => {
  const settingsSnap = await getDoc(settingsDoc);
  return settingsSnap.exists() ? settingsSnap.data() : null;
};

export const updateGameSettings = async (settings: any) => {
  await setDoc(settingsDoc, {
    ...settings,
    updatedAt: Timestamp.now(),
  }, { merge: true });
};

export const subscribeToGameSettings = (callback: (settings: any) => void) => {
  return onSnapshot(settingsDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  });
};
