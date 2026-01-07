import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../state/appStore";

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
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const gamePlays = useAppStore(s => s.gamePlays);
  const setNumberLimit = useAppStore(s => s.setNumberLimit);
  const removeNumberLimit = useAppStore(s => s.removeNumberLimit);

  const [selectedDraw, setSelectedDraw] = useState<string>("NY");
  const [newNumber, setNewNumber] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const currentVendor = vendors.find(v => v.email === user?.email);

  if (!currentVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Vendeur non trouvé</Text>
      </SafeAreaView>
    );
  }

  const selectedDrawSettings = currentVendor.draws[selectedDraw as keyof typeof currentVendor.draws];
  const numberLimits = selectedDrawSettings.numberLimits || [];

  // Calculate current totals from game plays
  const getNumberBetTotal = (number: string) => {
    return gamePlays
      .filter(g =>
        g.vendorId === currentVendor.id &&
        g.draw === selectedDraw &&
        g.numbers.some(n => n.toString().padStart(2, '0') === number)
      )
      .reduce((sum, g) => sum + g.betAmount, 0);
  };

  const addNumberLimit = () => {
    if (!newNumber || !newLimit) {
      Alert.alert("Erreur", "Veuillez entrer un numéro et une limite");
      return;
    }

    const numberStr = newNumber.padStart(2, '0');
    const limitAmount = parseFloat(newLimit);

    if (isNaN(limitAmount) || limitAmount <= 0) {
      Alert.alert("Erreur", "Veuillez entrer une limite valide");
      return;
    }

    if (parseInt(newNumber) < 0 || parseInt(newNumber) > 99) {
      Alert.alert("Erreur", "Le numéro doit être entre 00 et 99");
      return;
    }

    setNumberLimit(currentVendor.id, selectedDraw, numberStr, limitAmount);
    setNewNumber("");
    setNewLimit("");
    setIsAdding(false);
    Alert.alert("Succès", `Limite de $${limitAmount} ajoutée pour le numéro ${numberStr}`);
  };

  const handleRemoveLimit = (number: string) => {
    Alert.alert(
      "Supprimer la limite",
      `Êtes-vous sûr de vouloir supprimer la limite pour le numéro ${number}?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            removeNumberLimit(currentVendor.id, selectedDraw, number);
            Alert.alert("Succès", "Limite supprimée");
          },
        },
      ]
    );
  };

  const getTotalLimits = () => {
    return numberLimits.reduce((sum, nl) => sum + nl.limit, 0);
  };

  const getTotalBets = () => {
    return numberLimits.reduce((sum, nl) => sum + getNumberBetTotal(nl.number), 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Limites par Numéro</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setIsAdding(!isAdding)}
        >
          <Ionicons name={isAdding ? "close" : "add"} size={24} color="#ffffff" />
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
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.infoTitle}>Comment ça marche?</Text>
            </View>
            <Text style={styles.infoText}>
              Définissez une limite maximale pour chaque numéro. Si un joueur tente de parier sur un numéro qui a déjà atteint sa limite, la mise sera refusée.
              {"\n\n"}
              Exemple: Si vous définissez une limite de $600 pour le numéro 06 et que $570 ont déjà été misés, seul $30 de plus peut être accepté.
            </Text>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Limites Totales</Text>
                <Text style={styles.summaryValue}>${getTotalLimits().toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Mises Totales</Text>
                <Text style={styles.summaryValue}>${getTotalBets().toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Numéros Limités</Text>
                <Text style={styles.summaryValue}>{numberLimits.length}</Text>
              </View>
            </View>
          </View>

          {/* Add New Limit */}
          {isAdding && (
            <View style={styles.addCard}>
              <Text style={styles.addCardTitle}>Ajouter une Limite</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Numéro (00-99)</Text>
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
                  <Text style={styles.inputLabel}>Limite ($)</Text>
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
                <Text style={styles.addLimitButtonText}>Ajouter la Limite</Text>
              </Pressable>
            </View>
          )}

          {/* Number Limits List */}
          <View style={styles.limitsContainer}>
            <Text style={styles.sectionTitle}>
              Limites Actives ({numberLimits.length})
            </Text>

            {numberLimits.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ban-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>Aucune limite définie</Text>
                <Text style={styles.emptyStateSubtext}>
                  Appuyez sur + pour ajouter une limite
                </Text>
              </View>
            ) : (
              numberLimits
                .sort((a, b) => {
                  const totalA = getNumberBetTotal(a.number);
                  const totalB = getNumberBetTotal(b.number);
                  const percentA = (totalA / a.limit) * 100;
                  const percentB = (totalB / b.limit) * 100;
                  return percentB - percentA;
                })
                .map((limit) => {
                  const currentTotal = getNumberBetTotal(limit.number);
                  const remaining = limit.limit - currentTotal;
                  const percentage = (currentTotal / limit.limit) * 100;
                  const isNearLimit = percentage >= 80;
                  const isAtLimit = percentage >= 100;

                  return (
                    <View key={limit.number} style={styles.limitCard}>
                      <View style={styles.limitHeader}>
                        <View style={styles.limitInfo}>
                          <View style={styles.numberBadge}>
                            <Text style={styles.numberBadgeText}>{limit.number}</Text>
                          </View>
                          <View>
                            <Text style={styles.limitLabel}>Limite: ${limit.limit.toFixed(0)}</Text>
                            <Text style={[
                              styles.limitStatus,
                              isAtLimit && styles.limitStatusDanger,
                              isNearLimit && !isAtLimit && styles.limitStatusWarning,
                            ]}>
                              {isAtLimit ? "Limite atteinte" : `Restant: $${remaining.toFixed(0)}`}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleRemoveLimit(limit.number)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </Pressable>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBackground}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${Math.min(percentage, 100)}%` },
                              isAtLimit && styles.progressBarDanger,
                              isNearLimit && !isAtLimit && styles.progressBarWarning,
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          ${currentTotal.toFixed(0)} / ${limit.limit.toFixed(0)} ({percentage.toFixed(0)}%)
                        </Text>
                      </View>
                    </View>
                  );
                })
            )}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.guidelinesTitle}>Conseils</Text>
            </View>
            <Text style={styles.guidelinesText}>
              • Surveillez les numéros populaires (01-31 sont souvent plus joués){"\n"}
              • Ajustez les limites en fonction de votre capital{"\n"}
              • Réinitialisez les totaux après chaque tirage{"\n"}
              • Utilisez des limites plus élevées pour les numéros moins populaires{"\n"}
              • Vérifiez régulièrement l'état de vos limites
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
