import { create } from "zustand";
import { tchalaAPI } from "../api/apiClient";

export interface DreamEntry {
  keyword: string;
  numbers: number[];
  description?: string;
}

// Fallback local dictionary (used only when API is unreachable)
const FALLBACK_DICTIONARY: DreamEntry[] = [
  { keyword: "wedding", numbers: [29, 47], description: "Marriage, union, celebration" },
  { keyword: "maryaj", numbers: [29, 47], description: "Marriage, union, celebration" },
  { keyword: "death", numbers: [48, 17], description: "Ending, transformation" },
  { keyword: "lanmò", numbers: [48, 17], description: "Ending, transformation" },
  { keyword: "water", numbers: [25, 63], description: "Life, cleansing, flow" },
  { keyword: "dlo", numbers: [25, 63], description: "Life, cleansing, flow" },
  { keyword: "fire", numbers: [34, 81], description: "Passion, destruction, energy" },
  { keyword: "dife", numbers: [34, 81], description: "Passion, destruction, energy" },
  { keyword: "money", numbers: [19, 77], description: "Wealth, prosperity" },
  { keyword: "lajan", numbers: [19, 77], description: "Wealth, prosperity" },
  { keyword: "dog", numbers: [12, 44], description: "Loyalty, protection" },
  { keyword: "chen", numbers: [12, 44], description: "Loyalty, protection" },
  { keyword: "snake", numbers: [15, 92], description: "Wisdom, danger, transformation" },
  { keyword: "koulèv", numbers: [15, 92], description: "Wisdom, danger, transformation" },
];

interface TchalaState {
  dreamDictionary: DreamEntry[];
  searchResults: DreamEntry[];
  isLoaded: boolean;
  fetchDictionary: (language?: string) => Promise<void>;
  searchDream: (keyword: string) => void;
  clearSearch: () => void;
}

export const useTchalaStore = create<TchalaState>((set, get) => ({
  dreamDictionary: FALLBACK_DICTIONARY,
  searchResults: [],
  isLoaded: false,

  fetchDictionary: async (language = 'en') => {
    try {
      const data = await tchalaAPI.getAllDreams(language);
      if (Array.isArray(data) && data.length > 0) {
        set({ dreamDictionary: data, isLoaded: true });
      }
    } catch {
      // Keep fallback dictionary if API fails
    }
  },
  
  searchDream: (keyword) => {
    const lowercaseKeyword = keyword.toLowerCase().trim();
    if (!lowercaseKeyword) {
      set({ searchResults: [] });
      return;
    }
    
    const results = get().dreamDictionary.filter(entry =>
      entry.keyword.toLowerCase().includes(lowercaseKeyword) ||
      entry.description?.toLowerCase().includes(lowercaseKeyword)
    );
    
    set({ searchResults: results });
  },
  
  clearSearch: () => set({ searchResults: [] }),
}));