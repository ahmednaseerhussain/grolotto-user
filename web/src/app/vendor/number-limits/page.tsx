"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Trash2, StopCircle, PlayCircle, AlertTriangle, Shield, Loader2, Pencil
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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

interface NumberLimit {
  id: string;
  drawState: string;
  number: string;
  betLimit: number;
  currentTotal: number;
  isStopped: boolean;
  createdAt: string;
}

export default function NumberLimitsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);

  const [selectedDraw, setSelectedDraw] = useState("NY");
  const [isAdding, setIsAdding] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [stopNumber, setStopNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allLimits, setAllLimits] = useState<NumberLimit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState("");

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vendorAPI.getNumberLimits();
      setAllLimits(data);
    } catch (err) {
      toast.error("Failed to load number limits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const managedNumbers = allLimits.filter((l) => l.drawState === selectedDraw);
  const totalLimits = managedNumbers.reduce((s, n) => s + n.betLimit, 0);

  const handleAddLimit = async () => {
    const num = parseInt(newNumber);
    if (isNaN(num) || num < 0 || num > 99) {
      toast.error("Number must be between 00 and 99");
      return;
    }
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Please enter a valid limit amount");
      return;
    }
    setSaving(true);
    try {
      await vendorAPI.createNumberLimit({
        drawState: selectedDraw,
        number: String(num).padStart(2, "0"),
        betLimit: limit,
      });
      toast.success(`Limit set for number ${String(num).padStart(2, "0")}`);
      setNewNumber("");
      setNewLimit("");
      setIsAdding(false);
      fetchLimits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to set limit");
    } finally {
      setSaving(false);
    }
  };

  const handleStopSales = async () => {
    const num = parseInt(stopNumber);
    if (isNaN(num) || num < 0 || num > 99) {
      toast.error("Number must be between 00 and 99");
      return;
    }
    setSaving(true);
    try {
      // Create limit with isStopped=true (or update existing)
      await vendorAPI.createNumberLimit({
        drawState: selectedDraw,
        number: String(num).padStart(2, "0"),
        betLimit: 0,
        isStopped: true,
      } as any);
      toast.success(`Sales stopped for number ${String(num).padStart(2, "0")}`);
      setStopNumber("");
      setIsStopping(false);
      fetchLimits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to stop sales");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStop = async (item: NumberLimit) => {
    try {
      await vendorAPI.updateNumberLimit(item.id, { isStopped: !item.isStopped });
      toast.success(item.isStopped ? `Sales resumed for ${item.number}` : `Sales stopped for ${item.number}`);
      fetchLimits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  const handleDelete = async (item: NumberLimit) => {
    try {
      await vendorAPI.deleteNumberLimit(item.id);
      toast.success(`Limit removed for number ${item.number}`);
      fetchLimits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  const handleEditSave = async (item: NumberLimit) => {
    const newVal = parseFloat(editLimit);
    if (isNaN(newVal) || newVal <= 0) {
      toast.error("Please enter a valid limit amount");
      return;
    }
    try {
      await vendorAPI.updateNumberLimit(item.id, { betLimit: newVal });
      toast.success(`Limit updated for number ${item.number}`);
      setEditingId(null);
      setEditLimit("");
      fetchLimits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("limitsPerNumber") || "Limits Per Number"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setIsStopping(true)}>
            <StopCircle className="h-4 w-4 mr-1" /> Stop
          </Button>
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Draw Selector */}
      <div className="flex flex-wrap gap-2">
        {DRAWS.map((draw) => (
          <button
            key={draw.code}
            onClick={() => setSelectedDraw(draw.code)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              selectedDraw === draw.code
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
            }`}
          >
            {draw.flag} {draw.code}
          </button>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <p className="text-sm text-blue-800">
            {t("limitsExplanation") || "Set maximum bet limits for specific numbers. When a limit is reached, no more bets can be placed on that number."}
          </p>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">{t("totalLimits") || "Total Limits"}</p>
            <p className="text-lg font-bold">{formatCurrency(totalLimits, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">{t("totalBets") || "Total Bets"}</p>
            <p className="text-lg font-bold">-</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">{t("limitedNumbers") || "Limited Numbers"}</p>
            <p className="text-lg font-bold">{managedNumbers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Limit Form */}
      {isAdding && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t("addALimit") || "Add a Limit"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">{t("numberRange") || "Number (00-99)"}</label>
                <Input
                  type="number"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="00"
                  min={0}
                  max={99}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">{t("limitAmount") || "Limit Amount"}</label>
                <Input
                  type="number"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="Amount"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddLimit}>{t("addLimit") || "Add Limit"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stop Sales Form */}
      {isStopping && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t("stopSalesForNumber") || "Stop Sales for Number"}</h3>
            <Input
              type="number"
              value={stopNumber}
              onChange={(e) => setStopNumber(e.target.value)}
              placeholder="Number (00-99)"
              min={0}
              max={99}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleStopSales}>{t("stopSales") || "Stop Sales"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsStopping(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Managed Numbers List */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t("managedNumbers") || "Managed Numbers"}</h2>
        {loading ? (
          <Card className="bg-gray-50">
            <CardContent className="p-6 text-center text-gray-400">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-300" />
              <p className="text-sm">Loading limits...</p>
            </CardContent>
          </Card>
        ) : managedNumbers.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-6 text-center text-gray-400">
              <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t("noNumbersManaged") || "No numbers managed yet"}</p>
              <p className="text-xs">{t("pressToAddLimit") || "Click Add to set a limit"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {managedNumbers.map((item) => {
              const percentage = item.betLimit > 0 ? Math.min(100, (item.currentTotal / item.betLimit) * 100) : 0;
              const isEditing = editingId === item.id;
              return (
                <Card key={item.id}>
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className="bg-emerald-100 text-emerald-800 font-bold text-lg w-12 h-12 flex items-center justify-center rounded-xl">
                      {item.number.padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      {item.isStopped ? (
                        <Badge variant="destructive" className="text-xs">
                          <StopCircle className="h-3 w-3 mr-1" /> {t("salesStopped") || "Sales Stopped"}
                        </Badge>
                      ) : isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            className="w-28 h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" className="h-8" onClick={() => handleEditSave(item)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium">Limit: {formatCurrency(item.betLimit, currency)} | Bets: {formatCurrency(item.currentTotal, currency)}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!item.isStopped && !isEditing && (
                        <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => { setEditingId(item.id); setEditLimit(String(item.betLimit)); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {item.isStopped ? (
                        <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleToggleStop(item)}>
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleToggleStop(item)}>
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
