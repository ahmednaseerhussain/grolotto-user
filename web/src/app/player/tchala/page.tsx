"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { tchalaAPI } from "@/lib/api/public";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ArrowLeft, Search, Moon, X, Sparkles } from "lucide-react";

interface TchalaResult {
  id?: string;
  keyword: string;
  description?: string;
  numbers: number[];
}

const POPULAR_SEARCHES = ["wedding", "money", "water", "dog", "house", "snake"];

export default function TchalaScreen() {
  const router = useRouter();
  const t = useTranslation();
  const language = useAppStore((s) => s.language);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TchalaResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearchQuery(q);
    setSearched(true);
    setLoading(true);
    try {
      const res = await tchalaAPI.search(q);
      setResults(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {t("tchala") || "Tchala"} <Moon className="h-5 w-5 text-purple-500" />
          </h1>
          <p className="text-sm text-gray-500">{t("dreamNumbers") || "Dream Numbers"}</p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <p className="text-sm text-purple-800">
            <strong>Tchala</strong> is a Haitian tradition of interpreting dreams into lucky lottery numbers.
            Search for a dream symbol or keyword to find your lucky numbers!
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search your dream..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setResults([]); setSearched(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />)}
        </div>
      ) : searched && results.length === 0 ? (
        <EmptyState
          icon={<Moon className="h-12 w-12 text-gray-300" />}
          title="No results found"
          description="Try a different dream keyword"
        />
      ) : searched ? (
        <div className="space-y-3">
          {results.map((item, idx) => (
            <Card key={item.id || idx} className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 capitalize">{item.keyword}</h3>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {(item.numbers || []).map((num, i) => (
                    <span
                      key={i}
                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold"
                    >
                      {String(num).padStart(2, "0")}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Welcome / Popular Searches */
        <div className="text-center py-8">
          <Sparkles className="h-16 w-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Welcome to Tchala</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Search a dream to find your lucky numbers</p>
          <div>
            <p className="text-xs text-gray-400 mb-2">Popular searches</p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => { setSearchQuery(term); handleSearch(term); }}
                  className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition-colors capitalize"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
