import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { vendorAPI } from "../api/apiClient";

const DRAWS = [
  { code: "NY", name: "New York", flag: "🗽" },
  { code: "FL", name: "Florida", flag: "🏖️" },
  { code: "GA", name: "Georgia", flag: "🍑" },
  { code: "TX", name: "Texas", flag: "🤠" },
  { code: "PA", name: "Pennsylvania", flag: "🔔" },
  { code: "CT", name: "Connecticut", flag: "🍂" },
  { code: "TN", name: "Tennessee", flag: "🎸" },
  { code: "NJ", name: "New Jersey", flag: "🏙️" },
];

export default function NumberLimits() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  const [selectedDraw, setSelectedDraw] = useState<string>("NY");
  const [newNumber, setNewNumber] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [stopNumber, setStopNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allLimits, setAllLimits] = useState<any[]>([]);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState("");

  interface BackendLimit {
    id: string;
    drawState: string;
    number: string;
    betLimit: number;
    currentTotal: number;
    isStopped: boolean;
    createdAt: string;
  }

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vendorAPI.getNumberLimits();
      setAllLimits(data);
    } catch (err) {
      console.error('Failed to load number limits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const numberLimits: BackendLimit[] = allLimits.filter((l: any) => l.drawState === selectedDraw);
  const stoppedNumbers: string[] = numberLimits.filter((l: any) => l.isStopped).map((l: any) => l.number);

  // Get current total from backend data
  const getNumberBetTotal = (number: string) => {
    const limit = numberLimits.find((l: any) => l.number === number);
    return limit?.currentTotal || 0;
  };

  const addNumberLimit = async () => {
    if (!newNumber || !newLimit) {
      Alert.alert(t("error"), t("enterNumberAndLimit"));
      return;
    }

    const numberStr = newNumber.padStart(2, '0');
    const limitAmount = parseFloat(newLimit);

    if (isNaN(limitAmount) || limitAmount <= 0) {
      Alert.alert(t("error"), t("enterValidLimit"));
      return;
    }

    if (parseInt(newNumber) < 0 || parseInt(newNumber) > 99) {
      Alert.alert(t("error"), t("numberMustBe00to99"));
      return;
    }

    setSaving(true);
    try {
      await vendorAPI.createNumberLimit({ drawState: selectedDraw, number: numberStr, betLimit: limitAmount });
      setNewNumber("");
      setNewLimit("");
      setIsAdding(false);
      Alert.alert(t("success"), `${t("limitAdded")} $${limitAmount} → ${numberStr}`);
      fetchLimits();
    } catch (err: any) {
      Alert.alert(t("error"), err?.response?.data?.message || "Failed to set limit");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLimit = (item: BackendLimit) => {
    Alert.alert(
      t("removeLimit"),
      `${t("removeLimitConfirm")} ${item.number}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await vendorAPI.deleteNumberLimit(item.id);
              Alert.alert(t("success"), t("limitRemoved"));
              fetchLimits();
            } catch (err: any) {
              Alert.alert(t("error"), err?.response?.data?.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  const handleStopSales = (item: BackendLimit) => {
    Alert.alert(
      t("stopSalesTitle"),
      `${t("stopSalesConfirm")} ${item.number}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("stop"),
          style: "destructive",
          onPress: async () => {
            try {
              await vendorAPI.updateNumberLimit(item.id, { isStopped: true });
              Alert.alert(`✋ ${t("salesStopped")}`, `${t("noBetsAcceptedForNumber")} ${item.number}`);
              fetchLimits();
            } catch (err: any) {
              Alert.alert(t("error"), err?.response?.data?.message || "Failed to stop sales");
            }
          },
        },
      ]
    );
  };

  const handleStopNumberFromForm = async () => {
    if (!stopNumber) {
      Alert.alert(t("error"), t("enterNumberToStop"));
      return;
    }

    const numberStr = stopNumber.padStart(2, '0');

    if (parseInt(stopNumber) < 0 || parseInt(stopNumber) > 99) {
      Alert.alert(t("error"), t("numberMustBe00to99"));
      return;
    }

    setSaving(true);
    try {
      await vendorAPI.createNumberLimit({ drawState: selectedDraw, number: numberStr, betLimit: 0 });
      // Now mark it stopped
      const refreshed = await vendorAPI.getNumberLimits();
      const found = refreshed.find((l: any) => l.drawState === selectedDraw && l.number === numberStr);
      if (found) {
        await vendorAPI.updateNumberLimit(found.id, { isStopped: true });
      }
      setStopNumber("");
      setIsStopping(false);
      Alert.alert(`✋ ${t("salesStopped")}`, `${t("noBetsAcceptedForNumber")} ${numberStr}`);
      fetchLimits();
    } catch (err: any) {
      Alert.alert(t("error"), err?.response?.data?.message || "Failed to stop sales");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeSales = (item: BackendLimit) => {
    Alert.alert(
      t("resumeSalesTitle"),
      `${t("resumeSalesConfirm")} ${item.number}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("resume"),
          onPress: async () => {
            try {
              await vendorAPI.updateNumberLimit(item.id, { isStopped: false });
              Alert.alert(`✅ ${t("salesResumed")}`, `${t("betsNowAccepted")} ${item.number}`);
              fetchLimits();
            } catch (err: any) {
              Alert.alert(t("error"), err?.response?.data?.message || "Failed to resume");
            }
          },
        },
      ]
    );
  };

  const handleEditLimit = async (item: BackendLimit) => {
    const newVal = parseFloat(editLimitValue);
    if (isNaN(newVal) || newVal <= 0) {
      Alert.alert(t("error"), t("enterValidLimit"));
      return;
    }
    try {
      await vendorAPI.updateNumberLimit(item.id, { betLimit: newVal });
      Alert.alert(t("success"), `Limit updated for ${item.number}`);
      setEditingNumber(null);
      setEditLimitValue("");
      fetchLimits();
    } catch (err: any) {
      Alert.alert(t("error"), err?.response?.data?.message || "Failed to update");
    }
  };

  const getTotalLimits = () => {
    return numberLimits.reduce((sum: number, nl: any) => sum + nl.betLimit, 0);
  };

  const getTotalBets = () => {
    return numberLimits.reduce((sum: number, nl: any) => sum + (nl.currentTotal || 0), 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("limitsPerNumber")}</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.stopAllButton}
            onPress={() => setIsStopping(!isStopping)}
          >
            <Ionicons 
              name={isStopping ? "close" : "hand-right"} 
              size={24} 
              color="#ffffff" 
            />
          </Pressable>
          <Pressable
            style={styles.addButton}
            onPress={() => setIsAdding(!isAdding)}
          >
            <Ionicons name={isAdding ? "close" : "add"} size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* Draw Selector */}
      <View style={styles.drawSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawSelectorContent}>
          {DRAWS.map((draw) => {
            const isSelected = selectedDraw === draw.code;
            const drawLimitCount = allLimits.filter((l: any) => l.drawState === draw.code).length;

            return (
              <Pressable
                key={draw.code}
                style={[
                  styles.drawTab,
                  isSelected && styles.drawTabSelected,
                ]}
                onPress={() => setSelectedDraw(draw.code)}
              >
                <Text style={styles.drawTabFlag}>{draw.flag}</Text>
                <Text style={[
                  styles.drawTabText,
                  isSelected && styles.drawTabTextSelected,
                ]}>
                  {draw.code}{drawLimitCount > 0 ? ` (${drawLimitCount})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.infoTitle}>{t("howDoesItWork")}</Text>
            </View>
            <Text style={styles.infoText}>
              {t("limitsExplanation")}
            </Text>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("totalLimits")}</Text>
                <Text style={styles.summaryValue}>${getTotalLimits().toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("totalBets")}</Text>
                <Text style={styles.summaryValue}>${getTotalBets().toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("limitedNumbers")}</Text>
                <Text style={styles.summaryValue}>{numberLimits.length}</Text>
              </View>
            </View>
          </View>

          {/* Add New Limit */}
          {isAdding && (
            <View style={styles.addCard}>
              <Text style={styles.addCardTitle}>{t("addALimit")}</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t("numberRange")}</Text>
                  <TextInput
                    style={styles.input}
                    value={newNumber}
                    onChangeText={(text) => {
                      if (/^\d{0,2}$/.test(text)) {
                        setNewNumber(text);
                      }
                    }}
                    placeholder="Ex: 06"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t("limitAmount")}</Text>
                  <TextInput
                    style={styles.input}
                    value={newLimit}
                    onChangeText={setNewLimit}
                    placeholder="Ex: 600"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Pressable style={styles.addLimitButton} onPress={addNumberLimit}>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.addLimitButtonText}>{t("addLimit")}</Text>
              </Pressable>
            </View>
          )}

          {/* Stop Sales Form */}
          {isStopping && (
            <View style={styles.stopCard}>
              <Text style={styles.stopCardTitle}>{t("stopSalesForNumber")}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("numberRange")}</Text>
                <TextInput
                  style={styles.input}
                  value={stopNumber}
                  onChangeText={(text) => {
                    if (/^\d{0,2}$/.test(text)) {
                      setStopNumber(text);
                    }
                  }}
                  placeholder="Ex: 06"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <Pressable style={styles.stopSalesButton} onPress={handleStopNumberFromForm}>
                <Ionicons name="hand-right" size={20} color="#ffffff" />
                <Text style={styles.stopSalesButtonText}>{t("stopSales")}</Text>
              </Pressable>
            </View>
          )}

          {/* Number Limits List */}
          <View style={styles.limitsContainer}>
            {(() => {
              return (
                <>
                  <Text style={styles.sectionTitle}>
                    {t("managedNumbers")} ({numberLimits.length})
                  </Text>

                  {loading ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator size="large" color="#10b981" />
                      <Text style={styles.emptyStateText}>Loading limits...</Text>
                    </View>
                  ) : numberLimits.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="ban-outline" size={48} color="#d1d5db" />
                      <Text style={styles.emptyStateText}>{t("noNumbersManaged")}</Text>
                      <Text style={styles.emptyStateSubtext}>
                        {t("pressToAddLimit")}
                      </Text>
                    </View>
                  ) : (
                    numberLimits
                      .sort((a: any, b: any) => {
                        if (a.isStopped && !b.isStopped) return 1;
                        if (!a.isStopped && b.isStopped) return -1;
                        const percentA = a.betLimit > 0 ? (a.currentTotal / a.betLimit) * 100 : 0;
                        const percentB = b.betLimit > 0 ? (b.currentTotal / b.betLimit) * 100 : 0;
                        return percentB - percentA;
                      })
                      .map((item: any) => {
                        const currentTotal = item.currentTotal || 0;
                        const remaining = item.betLimit - currentTotal;
                        const percentage = item.betLimit > 0 ? (currentTotal / item.betLimit) * 100 : 0;
                        const isNearLimit = percentage >= 80;
                        const isAtLimit = percentage >= 100;
                        const isStopped = item.isStopped;
                        const isEditing = editingNumber === item.id;

                        return (
                          <View key={item.id} style={[
                            styles.limitCard,
                            isStopped && styles.limitCardStopped
                          ]}>
                            {/* Stopped Badge */}
                            {isStopped && (
                              <View style={styles.stoppedBadge}>
                                <Ionicons name="hand-right" size={14} color="#ffffff" />
                                <Text style={styles.stoppedBadgeText}>{t("stopped")}</Text>
                              </View>
                            )}

                            <View style={styles.limitHeader}>
                              <View style={styles.limitInfo}>
                                <View style={[
                                  styles.numberBadge,
                                  isStopped && styles.numberBadgeStopped
                                ]}>
                                  <Text style={styles.numberBadgeText}>{item.number}</Text>
                                </View>
                                <View>
                                  {isEditing ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <TextInput
                                        style={[styles.input, { width: 80, height: 32, paddingVertical: 4 }]}
                                        value={editLimitValue}
                                        onChangeText={setEditLimitValue}
                                        keyboardType="numeric"
                                        autoFocus
                                      />
                                      <Pressable onPress={() => handleEditLimit(item)}>
                                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                      </Pressable>
                                      <Pressable onPress={() => setEditingNumber(null)}>
                                        <Ionicons name="close-circle" size={24} color="#9ca3af" />
                                      </Pressable>
                                    </View>
                                  ) : (
                                    <>
                                      <Text style={styles.limitLabel}>
                                        {isStopped ? t("salesStopped") : `${t("limit")}: $${item.betLimit.toFixed(0)} | Bets: $${currentTotal.toFixed(0)}`}
                                      </Text>
                                      <Text style={[
                                        styles.limitStatus,
                                        isStopped && styles.limitStatusStopped,
                                        isAtLimit && !isStopped && styles.limitStatusDanger,
                                        isNearLimit && !isAtLimit && !isStopped && styles.limitStatusWarning,
                                      ]}>
                                        {isStopped
                                          ? t("noBetsAccepted")
                                          : isAtLimit
                                          ? t("limitReached")
                                          : `${t("remaining")}: $${remaining.toFixed(0)}`
                                        }
                                      </Text>
                                    </>
                                  )}
                                </View>
                              </View>

                              <View style={styles.actionButtons}>
                                {/* Edit Button */}
                                {!isStopped && !isEditing && (
                                  <Pressable
                                    style={styles.resumeButton}
                                    onPress={() => { setEditingNumber(item.id); setEditLimitValue(String(item.betLimit)); }}
                                  >
                                    <Ionicons name="pencil" size={20} color="#3b82f6" />
                                  </Pressable>
                                )}

                                {/* Stop/Resume Button */}
                                {isStopped ? (
                                  <Pressable
                                    style={styles.resumeButton}
                                    onPress={() => handleResumeSales(item)}
                                  >
                                    <Ionicons name="play-circle" size={24} color="#10b981" />
                                  </Pressable>
                                ) : (
                                  <Pressable
                                    style={styles.stopButton}
                                    onPress={() => handleStopSales(item)}
                                  >
                                    <Ionicons name="hand-right" size={24} color="#ef4444" />
                                  </Pressable>
                                )}

                                {/* Delete Button */}
                                <Pressable
                                  style={styles.deleteButton}
                                  onPress={() => handleRemoveLimit(item)}
                                >
                                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </Pressable>
                              </View>
                            </View>

                            {/* Progress Bar - only show if has limit and not stopped */}
                            {!isStopped && item.betLimit > 0 && (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBackground}>
                            <View
                              style={[
                                styles.progressBar,
                                { width: `${Math.min(percentage, 100)}%` },
                                isAtLimit && styles.progressBarDanger,
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                              {percentage.toFixed(1)}% {t("used")}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            );
          })()}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.guidelinesTitle}>{t("tips")}</Text>
            </View>
            <Text style={styles.guidelinesText}>
              {t("limitsGuidelinesText")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  stopAllButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#ef4444",
  },
  resumeAllButton: {
    backgroundColor: "#10b981",
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
  },
  drawSelector: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  drawSelectorContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawTab: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
  },
  drawTabSelected: {
    backgroundColor: "#3b82f6",
  },
  drawTabDisabled: {
    opacity: 0.5,
  },
  drawTabFlag: {
    fontSize: 16,
    marginBottom: 2,
  },
  drawTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  drawTabTextSelected: {
    color: "#ffffff",
  },
  drawTabTextDisabled: {
    color: "#d1d5db",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  drawStoppedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fecaca",
    gap: 12,
  },
  drawStoppedTextContainer: {
    flex: 1,
  },
  drawStoppedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 4,
  },
  drawStoppedText: {
    fontSize: 14,
    color: "#dc2626",
    lineHeight: 18,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  addCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  addCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1f2937",
  },
  addLimitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  addLimitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 6,
  },
  stopCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  stopCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  stopSalesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    marginTop: 16,
  },
  stopSalesButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 6,
  },
  limitsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  limitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    position: "relative",
    overflow: "visible",
  },
  limitCardStopped: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  stoppedBadge: {
    position: "absolute",
    top: -8,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  stoppedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  limitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  limitInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  numberBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  numberBadgeStopped: {
    backgroundColor: "#ef4444",
  },
  numberBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  limitLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  limitStatus: {
    fontSize: 12,
    color: "#10b981",
  },
  limitStatusWarning: {
    color: "#f59e0b",
  },
  limitStatusDanger: {
    color: "#ef4444",
  },
  limitStatusStopped: {
    color: "#dc2626",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stopButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
  },
  resumeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#d1fae5",
  },
  deleteButton: {
    padding: 8,
  },
  progressContainer: {
    gap: 8,
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 4,
  },
  progressBarWarning: {
    backgroundColor: "#f59e0b",
  },
  progressBarDanger: {
    backgroundColor: "#ef4444",
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  guidelinesCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginLeft: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
});
