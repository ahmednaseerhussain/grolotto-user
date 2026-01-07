import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";

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

const ratingTexts = {
  1: "Poor - Very disappointed",
  2: "Below Average - Not satisfied", 
  3: "Average - It was okay",
  4: "Good - Happy with service",
  5: "Excellent - Outstanding service!"
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

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert("Please Rate", "Please select a star rating before submitting.");
      return;
    }

    if (!comment.trim()) {
      Alert.alert("Add Comment", "Please add a comment about your experience.");
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
      "Review Submitted! ⭐",
      "Thank you for your feedback. Your review helps other players make informed decisions.",
      [
        {
          text: "Done",
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
        <Text style={styles.headerTitle}>Rate Vendor</Text>
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
                <Text style={styles.ratingText}>{vendor.rating.toFixed(1)} rating</Text>
              </View>
              {gamePlay && (
                <Text style={styles.gamePlayInfo}>
                  You played: {gamePlay.gameType} • {gamePlay.state} • ${gamePlay.betAmount}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How would you rate your experience?</Text>
          <StarSelector rating={rating} onRatingChange={setRating} />
          {rating > 0 && (
            <Text style={styles.ratingDescription}>
              {ratingTexts[rating as keyof typeof ratingTexts]}
            </Text>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Tell us about your experience</Text>
          <Text style={styles.commentHint}>
            Share details about the service, pricing, communication, or anything that would help other players.
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Write your review here..."
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
          <Text style={styles.sectionTitle}>Quick Comments (Optional)</Text>
          <View style={styles.quickOptions}>
            {[
              "Fast service",
              "Great prices", 
              "Easy to reach",
              "Professional",
              "Reliable payouts",
              "Helpful support"
            ].map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.quickOption,
                  comment.includes(option) && styles.quickOptionSelected
                ]}
                onPress={() => {
                  if (comment.includes(option)) {
                    setComment(comment.replace(option, "").replace("  ", " ").trim());
                  } else {
                    const newComment = comment ? `${comment} ${option}` : option;
                    if (newComment.length <= 500) {
                      setComment(newComment);
                    }
                  }
                }}
              >
                <Text style={[
                  styles.quickOptionText,
                  comment.includes(option) && styles.quickOptionSelectedText
                ]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesSection}>
          <View style={styles.guidelinesHeader}>
            <Ionicons name="information-circle" size={16} color="#6b7280" />
            <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
          </View>
          <Text style={styles.guidelinesText}>
            • Be honest and constructive{"\n"}
            • Focus on your actual experience{"\n"}
            • Avoid inappropriate language{"\n"}
            • Reviews are public and help other players
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
            {isSubmitting ? "Submitting..." : "Submit Review"}
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