import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

const StarSelector = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
  return (
    <View style={styles.starSelector}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onRatingChange(star)}
          style={styles.starButton}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={40}
            color={star <= rating ? "#f59e0b" : "#d1d5db"}
          />
        </Pressable>
      ))}
    </View>
  );
};

interface RouteParams {
  vendor: any;
  gamePlay?: any;
}

export default function VendorRating() {
  const navigation = useNavigation();
  const route = useRoute();
  const { vendor, gamePlay } = route.params as RouteParams;
  const user = useAppStore(s => s.user);
  const addVendorReview = useAppStore(s => s.addVendorReview);
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  const ratingTexts: Record<number, string> = {
    1: t("poorRating"),
    2: t("belowAverage"),
    3: t("averageRating"),
    4: t("goodRating"),
    5: t("excellentRating")
  };

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert(t("pleaseRate"), t("pleaseSelectRating"));
      return;
    }

    if (!comment.trim()) {
      Alert.alert(t("addComment"), t("pleaseAddComment"));
      return;
    }

    setIsSubmitting(true);

    const review = {
      id: `review_${Date.now()}`,
      vendorId: vendor.id,
      playerId: user?.id || "player1",
      playerName: user?.name || "Anonymous Player",
      rating,
      comment: comment.trim(),
      timestamp: Date.now(),
      gamePlay: gamePlay ? {
        gameType: gamePlay.gameType,
        draw: gamePlay.state,
        betAmount: gamePlay.betAmount
      } : undefined,
      isReported: false,
      isVisible: true
    };

    addVendorReview(review);

    setIsSubmitting(false);

    Alert.alert(
      t("reviewSubmitted"),
      t("thankYouForFeedback"),
      [
        {
          text: t("done"),
          onPress: () => navigation.goBack()
        }
      ]
    );
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
        <Text style={styles.headerTitle}>{t("rateVendor")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Vendor Info */}
        <View style={styles.vendorCard}>
          <View style={styles.vendorHeader}>
            <View style={styles.vendorAvatar}>
              <Ionicons name="storefront" size={32} color="#3b82f6" />
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>
                {vendor.displayName || `${vendor.firstName} ${vendor.lastName}`}
              </Text>
              <View style={styles.vendorRating}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.ratingText}>{vendor.rating.toFixed(1)} {t("rating")}</Text>
              </View>
              {gamePlay && (
                <Text style={styles.gamePlayInfo}>
                  {t("youPlayed")} {gamePlay.gameType} • {gamePlay.state} • ${gamePlay.betAmount}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>{t("howWouldYouRate")}</Text>
          <StarSelector rating={rating} onRatingChange={setRating} />
          {rating > 0 && (
            <Text style={styles.ratingDescription}>
              {ratingTexts[rating]}
            </Text>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>{t("tellUsAboutExperience")}</Text>
          <Text style={styles.commentHint}>
            {t("shareDetailsAboutService")}
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder={t("writeYourReview")}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* Quick Rating Options */}
        <View style={styles.quickOptionsSection}>
          <Text style={styles.sectionTitle}>{t("quickComments")}</Text>
          <View style={styles.quickOptions}>
            {[
              { key: "fastService", label: t("fastService") },
              { key: "greatPrices", label: t("greatPrices") }, 
              { key: "easyToReach", label: t("easyToReach") },
              { key: "professional", label: t("professional") },
              { key: "reliablePayouts", label: t("reliablePayouts") },
              { key: "helpfulSupport", label: t("helpfulSupport") }
            ].map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.quickOption,
                  comment.includes(option.label) && styles.quickOptionSelected
                ]}
                onPress={() => {
                  if (comment.includes(option.label)) {
                    setComment(comment.replace(option.label, "").replace("  ", " ").trim());
                  } else {
                    const newComment = comment ? `${comment} ${option.label}` : option.label;
                    if (newComment.length <= 500) {
                      setComment(newComment);
                    }
                  }
                }}
              >
                <Text style={[
                  styles.quickOptionText,
                  comment.includes(option.label) && styles.quickOptionSelectedText
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesSection}>
          <View style={styles.guidelinesHeader}>
            <Ionicons name="information-circle" size={16} color="#6b7280" />
            <Text style={styles.guidelinesTitle}>{t("reviewGuidelines")}</Text>
          </View>
          <Text style={styles.guidelinesText}>
            • {t("beHonestConstructive")}{"\n"}
            • {t("focusActualExperience")}{"\n"}
            • {t("avoidInappropriateLanguage")}{"\n"}
            • {t("reviewsArePublic")}
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <Pressable
          style={[
            styles.submitButton,
            (rating === 0 || !comment.trim() || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitReview}
          disabled={rating === 0 || !comment.trim() || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? t("submitting") : t("submitReview")}
          </Text>
        </Pressable>
      </View>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  vendorCard: {
    backgroundColor: "#ffffff",
    margin: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  vendorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  vendorAvatar: {
    backgroundColor: "#eff6ff",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  vendorRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  gamePlayInfo: {
    fontSize: 12,
    color: "#9ca3af",
  },
  ratingSection: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  starSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingDescription: {
    fontSize: 16,
    color: "#059669",
    fontWeight: "500",
    textAlign: "center",
  },
  commentSection: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  commentHint: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 120,
    textAlignVertical: "top",
    backgroundColor: "#ffffff",
  },
  characterCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 8,
  },
  quickOptionsSection: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickOption: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickOptionSelected: {
    backgroundColor: "#fff7ed",
    borderColor: "#f97316",
  },
  quickOptionText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  quickOptionSelectedText: {
    color: "#f97316",
  },
  guidelinesSection: {
    backgroundColor: "#fffbeb",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginLeft: 6,
  },
  guidelinesText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  submitSection: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitButton: {
    backgroundColor: "#f97316",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});