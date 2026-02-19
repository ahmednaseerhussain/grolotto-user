import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { DrawSettings } from "../state/appStore";

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
  { key: "senp", name: "Senp", description: "Pick 1 number (0-99)" },
  { key: "maryaj", name: "Maryaj", description: "Pick 2 numbers" },
  { key: "loto3", name: "Loto 3 chif", description: "Pick 3 digits" },
  { key: "loto4", name: "Loto 4 chif", description: "Pick 4 digits" },
  { key: "loto5", name: "Loto 5 chif", description: "Pick 5 digits" },
];

interface PricingData {
  [drawCode: string]: {
    [gameKey: string]: {
      minAmount: string;
      maxAmount: string;
    };
  };
}

export default function PricingLimits() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const updateVendorDrawSettings = useAppStore(s => s.updateVendorDrawSettings);
  
  const [selectedDraw, setSelectedDraw] = useState<string>("NY");
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const currentVendor = vendors.find(v => v.userId === user?.id);
  
  if (!currentVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Vendeur non trouvé</Text>
      </SafeAreaView>
    );
  }

  const [pricingData, setPricingData] = useState<PricingData>(() => {
    const initialData: PricingData = {};
    DRAWS.forEach(draw => {
      const drawSettings = currentVendor.draws[draw.code as keyof typeof currentVendor.draws];
      initialData[draw.code] = {};
      GAMES.forEach(game => {
        const gameSettings = drawSettings.games[game.key as keyof typeof drawSettings.games];
        initialData[draw.code][game.key] = {
          minAmount: gameSettings.minAmount.toString(),
          maxAmount: gameSettings.maxAmount.toString(),
        };
      });
    });
    return initialData;
  });

  const updatePricing = (drawCode: string, gameKey: string, field: 'minAmount' | 'maxAmount', value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;
    
    setPricingData(prev => ({
      ...prev,
      [drawCode]: {
        ...prev[drawCode],
        [gameKey]: {
          ...prev[drawCode][gameKey],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const validatePricing = () => {
    const errors: string[] = [];
    
    DRAWS.forEach(draw => {
      const drawSettings = currentVendor.draws[draw.code as keyof typeof currentVendor.draws];
      if (!drawSettings.enabled) return;
      
      GAMES.forEach(game => {
        const gameSettings = drawSettings.games[game.key as keyof typeof drawSettings.games];
        if (!gameSettings.enabled) return;
        
        const pricing = pricingData[draw.code][game.key];
        const min = parseInt(pricing.minAmount);
        const max = parseInt(pricing.maxAmount);
        
        if (!pricing.minAmount || !pricing.maxAmount) {
          errors.push(`${draw.name} - ${game.name}: Montants requis`);
        } else if (min >= max) {
          errors.push(`${draw.name} - ${game.name}: Min doit être < Max`);
        } else if (min < 1) {
          errors.push(`${draw.name} - ${game.name}: Minimum doit être ≥ $1`);
        } else if (max > 10000) {
          errors.push(`${draw.name} - ${game.name}: Maximum doit être ≤ $10,000`);
        }
      });
    });
    
    return errors;
  };

  const savePricing = () => {
    const errors = validatePricing();
    if (errors.length > 0) {
      Alert.alert("Erreurs de validation", errors.join("\n"));
      return;
    }

    // Save to store
    DRAWS.forEach(draw => {
      const drawSettings = currentVendor.draws[draw.code as keyof typeof currentVendor.draws];
      const updatedGames = { ...drawSettings.games };
      
      GAMES.forEach(game => {
        const pricing = pricingData[draw.code][game.key];
        updatedGames[game.key as keyof typeof updatedGames] = {
          ...updatedGames[game.key as keyof typeof updatedGames],
          minAmount: parseInt(pricing.minAmount),
          maxAmount: parseInt(pricing.maxAmount),
        };
      });
      
      const updatedDrawSettings: DrawSettings = {
        ...drawSettings,
        games: updatedGames,
      };
      
      updateVendorDrawSettings(currentVendor.id, draw.code, updatedDrawSettings);
    });

    setIsEditing(false);
    setHasChanges(false);
    Alert.alert("Succès", "Paramètres de prix sauvegardés!");
  };

  const resetPricing = () => {
    // Reset to current vendor settings
    const resetData: PricingData = {};
    DRAWS.forEach(draw => {
      const drawSettings = currentVendor.draws[draw.code as keyof typeof currentVendor.draws];
      resetData[draw.code] = {};
      GAMES.forEach(game => {
        const gameSettings = drawSettings.games[game.key as keyof typeof drawSettings.games];
        resetData[draw.code][game.key] = {
          minAmount: gameSettings.minAmount.toString(),
          maxAmount: gameSettings.maxAmount.toString(),
        };
      });
    });
    setPricingData(resetData);
    setHasChanges(false);
  };

  const applyTemplate = (templateType: 'conservative' | 'standard' | 'aggressive') => {
    const templates = {
      conservative: { senp: [1, 50], maryaj: [2, 100], loto3: [3, 200], loto4: [5, 500], loto5: [10, 1000] },
      standard: { senp: [1, 100], maryaj: [2, 200], loto3: [5, 500], loto4: [10, 1000], loto5: [20, 2000] },
      aggressive: { senp: [5, 500], maryaj: [10, 1000], loto3: [20, 2000], loto4: [50, 5000], loto5: [100, 10000] },
    };
    
    const template = templates[templateType];
    const newData: PricingData = { ...pricingData };
    
    DRAWS.forEach(draw => {
      GAMES.forEach(game => {
        const limits = template[game.key as keyof typeof template];
        newData[draw.code][game.key] = {
          minAmount: limits[0].toString(),
          maxAmount: limits[1].toString(),
        };
      });
    });
    
    setPricingData(newData);
    setHasChanges(true);
  };

  const selectedDrawSettings = currentVendor.draws[selectedDraw as keyof typeof currentVendor.draws];
  const enabledGames = GAMES.filter(game => 
    selectedDrawSettings.games[game.key as keyof typeof selectedDrawSettings.games].enabled
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Prix & Limites</Text>
        <Pressable 
          style={[styles.editButton, isEditing && styles.editButtonActive]}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons name={isEditing ? "checkmark" : "create"} size={20} color={isEditing ? "#ffffff" : "#6b7280"} />
        </Pressable>
      </View>

      {/* Draw Selector */}
      <View style={styles.drawSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawSelectorContent}>
          {DRAWS.map((draw) => {
            const drawSettings = currentVendor.draws[draw.code as keyof typeof currentVendor.draws];
            const isSelected = selectedDraw === draw.code;
            const isEnabled = drawSettings.enabled;
            
            return (
              <Pressable
                key={draw.code}
                style={[
                  styles.drawTab,
                  isSelected && styles.drawTabSelected,
                  !isEnabled && styles.drawTabDisabled,
                ]}
                onPress={() => setSelectedDraw(draw.code)}
                disabled={!isEnabled}
              >
                <Text style={styles.drawTabFlag}>{draw.flag}</Text>
                <Text style={[
                  styles.drawTabText,
                  isSelected && styles.drawTabTextSelected,
                  !isEnabled && styles.drawTabTextDisabled,
                ]}>
                  {draw.code}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Templates */}
          {isEditing && (
            <View style={styles.templatesCard}>
              <Text style={styles.templatesTitle}>Modèles de prix</Text>
              <Text style={styles.templatesDescription}>
                Appliquer des paramètres prédéfinis à tous vos tirages
              </Text>
              
              <View style={styles.templateButtons}>
                <Pressable 
                  style={[styles.templateButton, styles.conservativeButton]}
                  onPress={() => applyTemplate('conservative')}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                  <Text style={styles.templateButtonText}>Conservateur</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.templateButton, styles.standardButton]}
                  onPress={() => applyTemplate('standard')}
                >
                  <Ionicons name="trending-up" size={16} color="#3b82f6" />
                  <Text style={styles.templateButtonText}>Standard</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.templateButton, styles.aggressiveButton]}
                  onPress={() => applyTemplate('aggressive')}
                >
                  <Ionicons name="flash" size={16} color="#ef4444" />
                  <Text style={styles.templateButtonText}>Agressif</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Current Draw Info */}
          <View style={styles.drawInfoCard}>
            <View style={styles.drawInfoHeader}>
              <Text style={styles.drawInfoFlag}>{DRAWS.find(d => d.code === selectedDraw)?.flag}</Text>
              <View>
                <Text style={styles.drawInfoName}>{DRAWS.find(d => d.code === selectedDraw)?.name}</Text>
                <Text style={styles.drawInfoStatus}>
                  {enabledGames.length} jeu{enabledGames.length > 1 ? "x" : ""} activé{enabledGames.length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Games Pricing */}
          <View style={styles.gamesContainer}>
            {enabledGames.map((game) => {
              const pricing = pricingData[selectedDraw][game.key];
              
              return (
                <View key={game.key} style={styles.gameCard}>
                  <View style={styles.gameHeader}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gameDescription}>{game.description}</Text>
                  </View>
                  
                  <View style={styles.pricingControls}>
                    <View style={styles.pricingField}>
                      <Text style={styles.pricingLabel}>Minimum ($)</Text>
                      <TextInput
                        style={[styles.pricingInput, isEditing && styles.pricingInputEditable]}
                        value={pricing.minAmount}
                        onChangeText={(value) => updatePricing(selectedDraw, game.key, 'minAmount', value)}
                        placeholder="1"
                        keyboardType="numeric"
                        editable={isEditing}
                      />
                    </View>
                    
                    <View style={styles.pricingSeparator}>
                      <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                    </View>
                    
                    <View style={styles.pricingField}>
                      <Text style={styles.pricingLabel}>Maximum ($)</Text>
                      <TextInput
                        style={[styles.pricingInput, isEditing && styles.pricingInputEditable]}
                        value={pricing.maxAmount}
                        onChangeText={(value) => updatePricing(selectedDraw, game.key, 'maxAmount', value)}
                        placeholder="100"
                        keyboardType="numeric"
                        editable={isEditing}
                      />
                    </View>
                  </View>
                  
                  {/* Preview */}
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>Aperçu pour les joueurs:</Text>
                    <Text style={styles.previewText}>
                      "Miser entre ${pricing.minAmount || "0"} - ${pricing.maxAmount || "0"}"
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <Pressable 
                style={styles.resetButton}
                onPress={resetPricing}
              >
                <Ionicons name="refresh" size={16} color="#6b7280" />
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
                onPress={savePricing}
                disabled={!hasChanges}
              >
                <Ionicons name="checkmark" size={16} color="#ffffff" />
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </Pressable>
            </View>
          )}

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.guidelinesTitle}>Directives de prix</Text>
            </View>
            <Text style={styles.guidelinesText}>
              • Minimum: $1 - $50 (recommandé pour débuter){"\n"}
              • Maximum: $50 - $10,000 (selon votre clientèle){"\n"}
              • Senp: Jeu le plus populaire, prix accessibles{"\n"}
              • Loto 3/4/5: Gains plus élevés, limites plus hautes{"\n"}
              • Testez différents niveaux pour maximiser profits
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
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  editButtonActive: {
    backgroundColor: "#10b981",
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
  templatesCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  templatesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  templatesDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  templateButtons: {
    flexDirection: "row",
    gap: 8,
  },
  templateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  conservativeButton: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  standardButton: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  aggressiveButton: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  templateButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  drawInfoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  drawInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  drawInfoFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  drawInfoName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  drawInfoStatus: {
    fontSize: 14,
    color: "#10b981",
    marginTop: 2,
  },
  gamesContainer: {
    gap: 16,
  },
  gameCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  gameHeader: {
    marginBottom: 16,
  },
  gameName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  pricingControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  pricingField: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  pricingInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1f2937",
    textAlign: "center",
  },
  pricingInputEditable: {
    backgroundColor: "#ffffff",
    borderColor: "#3b82f6",
  },
  pricingSeparator: {
    paddingHorizontal: 12,
    paddingTop: 20,
  },
  previewContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  previewLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginLeft: 6,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 6,
  },
  guidelinesCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
});