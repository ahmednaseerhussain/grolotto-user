import { create } from "zustand";

export interface DreamEntry {
  keyword: string;
  numbers: number[];
  description?: string;
}

// Traditional Haitian dream dictionary numbers
const DREAM_DICTIONARY: DreamEntry[] = [
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
  { keyword: "cat", numbers: [3, 89], description: "Independence, mystery" },
  { keyword: "chat", numbers: [3, 89], description: "Independence, mystery" },
  { keyword: "snake", numbers: [15, 92], description: "Wisdom, danger, transformation" },
  { keyword: "koulèv", numbers: [15, 92], description: "Wisdom, danger, transformation" },
  { keyword: "fish", numbers: [28, 56], description: "Abundance, spirituality" },
  { keyword: "pwason", numbers: [28, 56], description: "Abundance, spirituality" },
  { keyword: "bird", numbers: [7, 73], description: "Freedom, messages from above" },
  { keyword: "zwazo", numbers: [7, 73], description: "Freedom, messages from above" },
  { keyword: "house", numbers: [22, 68], description: "Security, family, foundation" },
  { keyword: "kay", numbers: [22, 68], description: "Security, family, foundation" },
  { keyword: "car", numbers: [41, 86], description: "Journey, progress, status" },
  { keyword: "machin", numbers: [41, 86], description: "Journey, progress, status" },
  { keyword: "tree", numbers: [33, 91], description: "Growth, life, strength" },
  { keyword: "pyebwa", numbers: [33, 91], description: "Growth, life, strength" },
  { keyword: "baby", numbers: [5, 52], description: "New beginnings, innocence" },
  { keyword: "tibebe", numbers: [5, 52], description: "New beginnings, innocence" },
  { keyword: "mother", numbers: [14, 67], description: "Nurturing, protection, wisdom" },
  { keyword: "manman", numbers: [14, 67], description: "Nurturing, protection, wisdom" },
  { keyword: "father", numbers: [36, 74], description: "Authority, guidance, strength" },
  { keyword: "papa", numbers: [36, 74], description: "Authority, guidance, strength" },
  { keyword: "church", numbers: [21, 83], description: "Faith, community, blessing" },
  { keyword: "legliz", numbers: [21, 83], description: "Faith, community, blessing" },
  { keyword: "school", numbers: [18, 65], description: "Learning, growth, opportunity" },
  { keyword: "lekòl", numbers: [18, 65], description: "Learning, growth, opportunity" },
  { keyword: "rain", numbers: [26, 94], description: "Cleansing, renewal, blessing" },
  { keyword: "lapli", numbers: [26, 94], description: "Cleansing, renewal, blessing" },
  { keyword: "sun", numbers: [31, 79], description: "Life, energy, clarity" },
  { keyword: "solèy", numbers: [31, 79], description: "Life, energy, clarity" },
  { keyword: "moon", numbers: [9, 58], description: "Mystery, intuition, cycles" },
  { keyword: "lalin", numbers: [9, 58], description: "Mystery, intuition, cycles" },
  { keyword: "star", numbers: [11, 87], description: "Hope, guidance, dreams" },
  { keyword: "zetwal", numbers: [11, 87], description: "Hope, guidance, dreams" },
];

interface TchalaState {
  dreamDictionary: DreamEntry[];
  searchResults: DreamEntry[];
  searchDream: (keyword: string) => void;
  clearSearch: () => void;
}

export const useTchalaStore = create<TchalaState>((set) => ({
  dreamDictionary: DREAM_DICTIONARY,
  searchResults: [],
  
  searchDream: (keyword) => {
    const lowercaseKeyword = keyword.toLowerCase().trim();
    if (!lowercaseKeyword) {
      set({ searchResults: [] });
      return;
    }
    
    const results = DREAM_DICTIONARY.filter(entry =>
      entry.keyword.toLowerCase().includes(lowercaseKeyword) ||
      entry.description?.toLowerCase().includes(lowercaseKeyword)
    );
    
    set({ searchResults: results });
  },
  
  clearSearch: () => set({ searchResults: [] }),
}));