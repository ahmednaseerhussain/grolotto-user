import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { DrawSettings } from "../state/appStore";
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

const GAMES = [
  { key: "senp", name: "Senp", description: "1 numéro (0-99)", mandatory: true },
  { key: "maryaj", name: "Maryaj", description: "2 numéros", mandatory: false },
  { key: "loto3", name: "Loto 3 chif", description: "3 chiffres", mandatory: false },
  { key: "loto4", name: "Loto 4 chif", description: "4 chiffres", mandatory: false },
  { key: "loto5", name: "Loto 5 chif", description: "5 chiffres", mandatory: false },
];

export default function DrawManagement() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const language = useAppStore(s => s.language);
  
  const t = (key: string) => getTranslation(key as any, language);
  const vendors = useAppStore(s => s.vendors);
  const appSettings = useAppStore(s => s.appSettings);
  const updateVendorDrawSettings = useAppStore(s => s.updateVendorDrawSettings);
  
  const [expandedDraw, setExpandedDraw] = useState<string | null>(null);
  const [editingLimits, setEditingLimits] = useState<{drawCode: string, gameKey: string} | null>(null);
  const [tempLimits, setTempLimits] = useState<{min: string, max: string}>({min: "", max: ""});
  
  const currentVendor = vendors.find(v => v.userId === user?.id);
  
  if (!currentVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>{t("vendorNotFound")}</Text>
      </SafeAreaView>
    );
  }

  // Sync draw settings to backend API (fire-and-forget with error logging)
  const syncDrawToAPI = (drawCode: string, updatedDraw: DrawSettings) => {
    vendorAPI.updateDrawSettings(drawCode, updatedDraw).catch((err: any) => {
      console.error(`Failed to sync draw ${drawCode} to API:`, err);
    });
  };

  const toggleDrawEnabled = (drawCode: string) => {
    const currentDraw = currentVendor.draws[drawCode as keyof typeof currentVendor.draws];
    
    // If enabling a draw, ensure it has at least one active game
    if (!currentDraw.enabled && getEnabledGamesCount(currentDraw) === 0) {
      Alert.alert(
        t("noGamesEnabled"),
        t("enableAtLeastOneGame"),
        [
          {
            text: "OK",
            onPress: () => {
              // Auto-enable Senp when enabling a draw
              const updatedDrawWithSenp: DrawSettings = {
                ...currentDraw,
                enabled: true,
                games: {
                  ...currentDraw.games,
                  senp: { ...currentDraw.games.senp, enabled: true }
                }
              };
              updateVendorDrawSettings(currentVendor.id, drawCode, updatedDrawWithSenp);
              syncDrawToAPI(drawCode, updatedDrawWithSenp);
            }
          }
        ]
      );
      return;
    }
    
    const updatedDraw: DrawSettings = {
      ...currentDraw,
      enabled: !currentDraw.enabled,
    };
    updateVendorDrawSettings(currentVendor.id, drawCode, updatedDraw);
    syncDrawToAPI(drawCode, updatedDraw);
  };

  const toggleGameEnabled = (drawCode: string, gameKey: string) => {
    const currentDraw = currentVendor.draws[drawCode as keyof typeof currentVendor.draws];
    
    // Prevent disabling if it's the only enabled game in an active draw
    if (currentDraw.enabled && getEnabledGamesCount(currentDraw) === 1) {
      const gameSettings = currentDraw.games[gameKey as keyof typeof currentDraw.games];
      if (gameSettings.enabled) {
        Alert.alert(
          t("cannotDisable"),
          t("cannotDisableDesc"),
          [{ text: "OK" }]
        );
        return;
      }
    }
    
    const updatedDraw: DrawSettings = {
      ...currentDraw,
      games: {
        ...currentDraw.games,
        [gameKey]: {
          ...currentDraw.games[gameKey as keyof typeof currentDraw.games],
          enabled: !currentDraw.games[gameKey as keyof typeof currentDraw.games].enabled,
        },
      },
    };
    updateVendorDrawSettings(currentVendor.id, drawCode, updatedDraw);
    syncDrawToAPI(drawCode, updatedDraw);
  };

  const startEditingLimits = (drawCode: string, gameKey: string) => {
    const currentDraw = currentVendor.draws[drawCode as keyof typeof currentVendor.draws];
    const gameSettings = currentDraw.games[gameKey as keyof typeof currentDraw.games];
    
    setEditingLimits({ drawCode, gameKey });
    setTempLimits({
      min: gameSettings.minAmount.toString(),
      max: gameSettings.maxAmount.toString()
    });
  };

  const saveLimits = () => {
    if (!editingLimits) return;
    
    const minAmount = parseFloat(tempLimits.min);
    const maxAmount = parseFloat(tempLimits.max);
    
    // Validation
    if (isNaN(minAmount) || isNaN(maxAmount)) {
      Alert.alert(t("error"), t("enterValidAmounts"));
      return;
    }
    
    if (minAmount >= maxAmount) {
      Alert.alert(t("error"), t("minMustBeLessThanMax"));
      return;
    }
    
    if (minAmount < appSettings.minBetAmount || maxAmount > appSettings.maxBetAmount) {
      Alert.alert(
        t("error"), 
        `${t("limitsMustBeWithinGlobal")}: ${appSettings.minBetAmount} - ${appSettings.maxBetAmount}`
      );
      return;
    }
    
    const { drawCode, gameKey } = editingLimits;
    const currentDraw = currentVendor.draws[drawCode as keyof typeof currentVendor.draws];
    
    const updatedDraw: DrawSettings = {
      ...currentDraw,
      games: {
        ...currentDraw.games,
        [gameKey]: {
          ...currentDraw.games[gameKey as keyof typeof currentDraw.games],
          minAmount,
          maxAmount,
        },
      },
    };
    
    updateVendorDrawSettings(currentVendor.id, drawCode, updatedDraw);
    syncDrawToAPI(drawCode, updatedDraw);
    setEditingLimits(null);
  };

  const cancelEditingLimits = () => {
    setEditingLimits(null);
    setTempLimits({min: "", max: ""});
  };

  const getEnabledGamesCount = (draw: DrawSettings) => {
    return Object.values(draw.games).filter(game => game.enabled).length;
  };

  const getDrawStatus = (draw: DrawSettings) => {
    if (!draw.enabled) return { status: t("disabled"), color: "#9ca3af" };
    const enabledGames = getEnabledGamesCount(draw);
    return { 
      status: `${enabledGames} ${t("gamesActive")}`, 
      color: "#10b981" 
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("statesAndGames")}</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => (navigation as any).navigate("VendorPlayHistory")}
        >
          <Ionicons name="analytics" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      {/* Stats Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {Object.values(currentVendor.draws).filter(draw => draw.enabled).length}
          </Text>
          <Text style={styles.summaryLabel}>{t("activeDraws")}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {Object.values(currentVendor.draws).reduce((total, draw) => total + getEnabledGamesCount(draw), 0)}
          </Text>
          <Text style={styles.summaryLabel}>{t("enabledGames")}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ${(currentVendor.totalRevenue || 0).toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>{t("totalRevenue")}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Pricing Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.instructionsTitle}>{t("priceConfig")}</Text>
            </View>
            <Text style={styles.instructionsText}>
              {t("priceConfigInstructions")}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>{t("availableStates")}</Text>
          <Text style={styles.sectionDescription}>
            {t("enableDrawsDesc")}
          </Text>

          {DRAWS.map((draw) => {
            const drawSettings = currentVendor.draws[draw.code as keyof typeof currentVendor.draws];
            const status = getDrawStatus(drawSettings);
            const isExpanded = expandedDraw === draw.code;

            return (
              <View key={draw.code} style={styles.drawCard}>
                <Pressable
                  style={styles.drawHeader}
                  onPress={() => setExpandedDraw(isExpanded ? null : draw.code)}
                >
                  <View style={styles.drawInfo}>
                    <Text style={styles.drawFlag}>{draw.flag}</Text>
                    <View>
                      <Text style={styles.drawName}>{draw.name}</Text>
                      <Text style={[styles.drawStatus, { color: status.color }]}>
                        {status.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.drawActions}>
                    <Switch
                      value={drawSettings.enabled}
                      onValueChange={() => toggleDrawEnabled(draw.code)}
                      trackColor={{ false: "#d1d5db", true: "#10b981" }}
                      thumbColor={drawSettings.enabled ? "#ffffff" : "#f3f4f6"}
                    />
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9ca3af"
                      style={styles.chevronIcon}
                    />
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.drawContent}>
                    <Text style={styles.gamesTitle}>{t("availableGameTypes")}</Text>
                    
                    {GAMES.map((game) => {
                      const gameSettings = drawSettings.games[game.key as keyof typeof drawSettings.games];
                      const isGameEnabled = gameSettings.enabled;
                      const canDisable = !game.mandatory || getEnabledGamesCount(drawSettings) > 1;

                      return (
                        <View key={game.key} style={styles.gameRow}>
                          <View style={styles.gameInfo}>
                            <View style={styles.gameHeader}>
                              <Text style={styles.gameName}>{game.name}</Text>
                              {game.mandatory && (
                                <View style={styles.mandatoryBadge}>
                                  <Text style={styles.mandatoryText}>{t("mandatory")}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.gameDescription}>{game.description}</Text>
                            {editingLimits?.drawCode === draw.code && editingLimits?.gameKey === game.key ? (
                              <View style={styles.limitsEditor}>
                                <View style={styles.limitsInputRow}>
                                  <View style={styles.limitInputGroup}>
                                    <Text style={styles.limitLabel}>{t("min")}:</Text>
                                    <TextInput
                                      style={styles.limitInput}
                                      value={tempLimits.min}
                                      onChangeText={(text) => setTempLimits({...tempLimits, min: text})}
                                      keyboardType="numeric"
                                      placeholder="0"
                                    />
                                  </View>
                                  <View style={styles.limitInputGroup}>
                                    <Text style={styles.limitLabel}>{t("max")}:</Text>
                                    <TextInput
                                      style={styles.limitInput}
                                      value={tempLimits.max}
                                      onChangeText={(text) => setTempLimits({...tempLimits, max: text})}
                                      keyboardType="numeric"
                                      placeholder="100"
                                    />
                                  </View>
                                </View>
                                <View style={styles.limitsActions}>
                                  <Pressable 
                                    style={styles.cancelButton}
                                    onPress={cancelEditingLimits}
                                  >
                                    <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
                                  </Pressable>
                                  <Pressable 
                                    style={styles.saveButton}
                                    onPress={saveLimits}
                                  >
                                    <Text style={styles.saveButtonText}>{t("save")}</Text>
                                  </Pressable>
                                </View>
                                <Text style={styles.globalLimitsText}>
                                  {t("globalLimits")}: ${appSettings.minBetAmount} - ${appSettings.maxBetAmount}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.gameLimits}>
                              <View style={styles.gameLimitsRow}>
                                <Text style={styles.limitText}>
                                  {t("min")}: ${gameSettings.minAmount} • {t("max")}: ${gameSettings.maxAmount}
                                </Text>
                                <Pressable 
                                  style={[styles.editLimitsButton, (!drawSettings.enabled || !isGameEnabled) ? styles.editLimitsButtonDisabled : styles.editLimitsButtonEnabled]}
                                  onPress={() => {
                                    if (!drawSettings.enabled || !isGameEnabled) {
                                      Alert.alert(t("configUnavailable"), t("enableDrawAndGameFirst"));
                                      return;
                                    }
                                    startEditingLimits(draw.code, game.key);
                                  }}
                                >
                                  <Text style={[styles.editLimitsButtonText, (!drawSettings.enabled || !isGameEnabled) ? styles.editLimitsButtonTextDisabled : styles.editLimitsButtonTextEnabled]}>
                                    {t("editLimits")}
                                  </Text>
                                </Pressable>
                              </View>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.gameActions}>
                            <Switch
                              value={isGameEnabled}
                              onValueChange={() => toggleGameEnabled(draw.code, game.key)}
                              disabled={!drawSettings.enabled || (game.mandatory && !canDisable)}
                              trackColor={{ false: "#d1d5db", true: "#10b981" }}
                              thumbColor={isGameEnabled ? "#ffffff" : "#f3f4f6"}
                            />
                            <Pressable 
                              style={[styles.configButton, (!drawSettings.enabled || !isGameEnabled) ? styles.configButtonDisabled : styles.configButtonEnabled]}
                              onPress={() => {
                                if (!drawSettings.enabled || !isGameEnabled) {
                                  Alert.alert(t("configUnavailable"), t("enableDrawAndGameFirst"));
                                  return;
                                }
                                startEditingLimits(draw.code, game.key);
                              }}
                            >
                              <Ionicons 
                                name="settings-outline" 
                                size={18} 
                                color={(!drawSettings.enabled || !isGameEnabled) ? "#9ca3af" : "#f97316"} 
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}

                    <Pressable style={styles.previewButton}>
                      <Ionicons name="eye-outline" size={16} color="#3b82f6" />
                      <Text style={styles.previewButtonText}>{t("previewForPlayers")}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* Quick Setup */}
          <View style={styles.quickSetupCard}>
            <Text style={styles.quickSetupTitle}>{t("quickSetup")}</Text>
            <Text style={styles.quickSetupDescription}>
              {t("applyPresetSettings")}
            </Text>
            
            <View style={styles.quickSetupActions}>
              <Pressable style={styles.quickSetupButton}>
                <Ionicons name="flash" size={16} color="#f59e0b" />
                <Text style={styles.quickSetupButtonText}>{t("beginner")}</Text>
              </Pressable>
              
              <Pressable style={styles.quickSetupButton}>
                <Ionicons name="trending-up" size={16} color="#3b82f6" />
                <Text style={styles.quickSetupButtonText}>{t("advanced")}</Text>
              </Pressable>
              
              <Pressable style={styles.quickSetupButton}>
                <Ionicons name="star" size={16} color="#8b5cf6" />
                <Text style={styles.quickSetupButtonText}>{t("enableAll")}</Text>
              </Pressable>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.tipsTitle}>{t("tips")}</Text>
            </View>
            <Text style={styles.tipsText}>
              {t("drawManagementTips")}
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
  },
  headerSpacer: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  instructionsCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  drawCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  drawHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  drawInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  drawFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  drawName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  drawStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  drawActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevronIcon: {
    marginLeft: 12,
  },
  drawContent: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    padding: 16,
  },
  gamesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  gameInfo: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  gameName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    marginRight: 8,
  },
  mandatoryBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryText: {
    fontSize: 10,
    color: "#92400e",
    fontWeight: "500",
  },
  gameDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  gameLimits: {
    flexDirection: "row",
    alignItems: "center",
  },
  gameLimitsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  limitText: {
    fontSize: 11,
    color: "#9ca3af",
    flex: 1,
  },
  editLimitsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  editLimitsButtonEnabled: {
    backgroundColor: "#f97316",
  },
  editLimitsButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  editLimitsButtonText: {
    fontSize: 10,
    fontWeight: "600",
  },
  editLimitsButtonTextEnabled: {
    color: "#ffffff",
  },
  editLimitsButtonTextDisabled: {
    color: "#9ca3af",
  },
  gameActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  configButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
  },
  configButtonEnabled: {
    backgroundColor: "#fff7ed",
  },
  configButtonDisabled: {
    backgroundColor: "#f9fafb",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  previewButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 6,
  },
  quickSetupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickSetupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  quickSetupDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  quickSetupActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickSetupButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickSetupButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  tipsCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  // Pricing Limits Editor Styles
  limitsEditor: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  limitsInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  limitInputGroup: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  limitInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  limitsActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f97316",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  globalLimitsText: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
});