"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ChevronDown, ChevronUp, Check, X, Save, BarChart3, Loader2
} from "lucide-react";
import { formatCurrency, GAME_LABELS } from "@/lib/utils";
import toast from "react-hot-toast";

const DRAWS = [
  { code: "NY", name: "New York", flag: "🗽" },
  { code: "FL", name: "Florida", flag: "🌴" },
  { code: "GA", name: "Georgia", flag: "🍑" },
  { code: "TX", name: "Texas", flag: "⛳" },
  { code: "PA", name: "Pennsylvania", flag: "🔔" },
  { code: "CT", name: "Connecticut", flag: "🏛️" },
  { code: "TN", name: "Tennessee", flag: "🎵" },
  { code: "NJ", name: "New Jersey", flag: "🏖️" },
];

const GAMES = ["senp", "maryaj", "loto3", "loto4", "loto5"];

export default function DrawManagementScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const vendors = useAppStore((s) => s.vendors);
  const vendorProfile = useAppStore((s) => s.vendorProfile);
  const currency = useAppStore((s) => s.currency);

  const [expandedDraw, setExpandedDraw] = useState<string | null>(null);
  const [editingLimits, setEditingLimits] = useState<{ drawCode: string; gameKey: string } | null>(null);
  const [tempLimits, setTempLimits] = useState({ min: "", max: "" });
  const [saving, setSaving] = useState(false);

  const vendor = vendorProfile || vendors.find((v: any) => v.userId === user?.id);
  const draws: Record<string, any> = vendor?.draws || {};

  const getActiveDrawsCount = () =>
    Object.values(draws).filter((d: any) => d?.enabled).length;

  const getEnabledGamesCount = () => {
    let count = 0;
    Object.values(draws).forEach((d: any) => {
      if (d?.enabled) {
        Object.values(d.games || {}).forEach((g: any) => {
          if (g?.enabled) count++;
        });
      }
    });
    return count;
  };

  const handleToggleDraw = async (drawCode: string, enabled: boolean) => {
    try {
      const updatedDraw = { ...draws[drawCode], enabled };
      if (enabled && !draws[drawCode]?.games?.senp?.enabled) {
        updatedDraw.games = { ...updatedDraw.games, senp: { ...updatedDraw.games?.senp, enabled: true } };
      }
      await vendorAPI.updateDrawSettings(drawCode, updatedDraw);
      toast.success(`${drawCode} ${enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const handleToggleGame = async (drawCode: string, gameKey: string, enabled: boolean) => {
    const draw = draws[drawCode];
    if (!enabled) {
      const enabledGames = Object.entries(draw?.games || {}).filter(([k, g]: [string, any]) => g?.enabled && k !== gameKey);
      if (enabledGames.length === 0) {
        toast.error(t("cannotDisable") || "Cannot disable the last game");
        return;
      }
    }
    try {
      const updatedDraw = {
        ...draw,
        games: { ...draw.games, [gameKey]: { ...draw.games?.[gameKey], enabled } },
      };
      await vendorAPI.updateDrawSettings(drawCode, updatedDraw);
      toast.success(`${GAME_LABELS[gameKey]} ${enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const handleSaveLimits = async () => {
    if (!editingLimits) return;
    const { drawCode, gameKey } = editingLimits;
    const min = parseFloat(tempLimits.min);
    const max = parseFloat(tempLimits.max);
    if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0 || min >= max) {
      toast.error(t("enterValidAmounts") || "Please enter valid amounts");
      return;
    }
    setSaving(true);
    try {
      const draw = draws[drawCode];
      const updatedDraw = {
        ...draw,
        games: {
          ...draw.games,
          [gameKey]: { ...draw.games?.[gameKey], minAmount: min, maxAmount: max },
        },
      };
      await vendorAPI.updateDrawSettings(drawCode, updatedDraw);
      toast.success("Limits saved");
      setEditingLimits(null);
    } catch (err) {
      toast.error("Failed to save limits");
    } finally {
      setSaving(false);
    }
  };

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t("vendorNotFound") || "Vendor not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("statesAndGames") || "States & Games"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/vendor/history")}>
          <BarChart3 className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-blue-600">{t("activeDraws") || "Active Draws"}</p>
            <p className="text-2xl font-bold text-blue-700">{getActiveDrawsCount()}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-600">{t("enabledGames") || "Enabled Games"}</p>
            <p className="text-2xl font-bold text-emerald-700">{getEnabledGamesCount()}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-purple-600">{t("totalRevenue") || "Revenue"}</p>
            <p className="text-lg font-bold text-purple-700">-</p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-3">
          <p className="text-sm text-amber-800">{t("priceConfigInstructions") || "Enable or disable draws and game types. Set min/max bet amounts per game."}</p>
        </CardContent>
      </Card>

      {/* Draw Accordions */}
      <div className="space-y-3">
        {DRAWS.map((draw) => {
          const drawData = draws[draw.code] || {};
          const isEnabled = drawData.enabled || false;
          const isExpanded = expandedDraw === draw.code;
          return (
            <Card key={draw.code} className={isEnabled ? "" : "opacity-60"}>
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{draw.flag}</span>
                    <div>
                      <p className="font-semibold">{draw.name}</p>
                      <p className="text-xs text-gray-500">{draw.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={isEnabled ? "success" : "secondary"}>
                      {isEnabled ? "Active" : "Inactive"}
                    </Badge>
                    <button
                      onClick={() => handleToggleDraw(draw.code, !isEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        isEnabled ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        isEnabled ? "translate-x-5" : ""
                      }`} />
                    </button>
                    {isEnabled && (
                      <button onClick={() => setExpandedDraw(isExpanded ? null : draw.code)}>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Games */}
                {isExpanded && isEnabled && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    {GAMES.map((game) => {
                      const gameData = drawData.games?.[game] || {};
                      const gameEnabled = gameData.enabled || false;
                      const isMandatory = game === "senp";
                      const isEditingThis = editingLimits?.drawCode === draw.code && editingLimits?.gameKey === game;

                      return (
                        <div key={game} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{GAME_LABELS[game]}</span>
                                {isMandatory && <Badge variant="warning" className="text-[10px]">Mandatory</Badge>}
                              </div>
                              {!isEditingThis ? (
                                <button
                                  onClick={() => {
                                    setEditingLimits({ drawCode: draw.code, gameKey: game });
                                    setTempLimits({ min: String(gameData.minAmount || ""), max: String(gameData.maxAmount || "") });
                                  }}
                                  className="text-xs text-gray-500 hover:text-blue-600"
                                >
                                  {t("min") || "Min"}: {formatCurrency(gameData.minAmount || 0, currency)} | {t("max") || "Max"}: {formatCurrency(gameData.maxAmount || 0, currency)}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    type="number"
                                    value={tempLimits.min}
                                    onChange={(e) => setTempLimits({ ...tempLimits, min: e.target.value })}
                                    placeholder="Min"
                                    className="w-24 h-7 text-xs"
                                  />
                                  <span className="text-gray-400">-</span>
                                  <Input
                                    type="number"
                                    value={tempLimits.max}
                                    onChange={(e) => setTempLimits({ ...tempLimits, max: e.target.value })}
                                    placeholder="Max"
                                    className="w-24 h-7 text-xs"
                                  />
                                  <Button size="sm" className="h-7 px-2" onClick={handleSaveLimits} loading={saving}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingLimits(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          {!isMandatory && (
                            <button
                              onClick={() => handleToggleGame(draw.code, game, !gameEnabled)}
                              className={`relative w-9 h-5 rounded-full transition-colors ${
                                gameEnabled ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                gameEnabled ? "translate-x-4" : ""
                              }`} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
