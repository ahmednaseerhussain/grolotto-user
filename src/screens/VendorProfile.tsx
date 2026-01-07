import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";

const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={size}
          color={star <= rating ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </View>
  );
};

const ReviewItem = ({ review, onRespond, onReport, onHide }: any) => {
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const handleRespond = () => {
    if (!responseText.trim()) {
      Alert.alert("Error", "Please enter a response message");
      return;
    }
    onRespond(review.id, responseText);
    setShowResponseModal(false);
    setResponseText("");
    Alert.alert("Success", "Response posted successfully!");
  };

  const handleReport = () => {
    if (!reportReason.trim()) {
      Alert.alert("Error", "Please provide a reason for reporting");
      return;
    }
    onReport(review.id, reportReason);
    setShowReportModal(false);
    setReportReason("");
    Alert.alert("Success", "Review reported. Our team will review it within 24 hours.");
  };

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          <View style={styles.playerAvatar}>
            <Ionicons name="person" size={20} color="#6b7280" />
          </View>
          <View>
            <Text style={styles.playerName}>{review.playerName}</Text>
            <View style={styles.reviewMeta}>
              <StarRating rating={review.rating} />
              <Text style={styles.reviewDate}>
                {new Date(review.timestamp).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.reviewActions}>
          <Pressable 
            style={styles.reviewActionButton}
            onPress={() => setShowResponseModal(true)}
            disabled={!!review.vendorResponse}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={16} 
              color={review.vendorResponse ? "#d1d5db" : "#3b82f6"} 
            />
          </Pressable>
          <Pressable 
            style={styles.reviewActionButton}
            onPress={() => setShowReportModal(true)}
            disabled={review.isReported}
          >
            <Ionicons 
              name="flag-outline" 
              size={16} 
              color={review.isReported ? "#ef4444" : "#9ca3af"} 
            />
          </Pressable>
          <Pressable 
            style={styles.reviewActionButton}
            onPress={() => {
              Alert.alert(
                "Hide Review",
                "Are you sure you want to hide this review from public view?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Hide", 
                    style: "destructive",
                    onPress: () => onHide(review.id)
                  }
                ]
              );
            }}
          >
            <Ionicons name="eye-off-outline" size={16} color="#9ca3af" />
          </Pressable>
        </View>
      </View>

      {review.gamePlay && (
        <View style={styles.gamePlayInfo}>
          <Text style={styles.gamePlayText}>
            Played {review.gamePlay.gameType} • {review.gamePlay.draw} • ${review.gamePlay.betAmount}
          </Text>
        </View>
      )}

      <Text style={styles.reviewComment}>{review.comment}</Text>

      {review.vendorResponse && (
        <View style={styles.vendorResponse}>
          <View style={styles.vendorResponseHeader}>
            <Ionicons name="storefront" size={16} color="#10b981" />
            <Text style={styles.vendorResponseLabel}>Your Response</Text>
            <Text style={styles.vendorResponseDate}>
              {new Date(review.vendorResponse.timestamp).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.vendorResponseText}>{review.vendorResponse.message}</Text>
        </View>
      )}

      {review.isReported && (
        <View style={styles.reportedBadge}>
          <Ionicons name="flag" size={12} color="#ef4444" />
          <Text style={styles.reportedText}>Reported for review</Text>
        </View>
      )}

      {/* Response Modal */}
      <Modal visible={showResponseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respond to Review</Text>
              <Pressable onPress={() => setShowResponseModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <TextInput
              style={styles.responseInput}
              placeholder="Write your response..."
              value={responseText}
              onChangeText={setResponseText}
              multiline
              maxLength={500}
            />
            <Text style={styles.characterCount}>{responseText.length}/500</Text>
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => setShowResponseModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.postButton} onPress={handleRespond}>
                <Text style={styles.postButtonText}>Post Response</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Review</Text>
              <Pressable onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <Text style={styles.reportDescription}>
              Why are you reporting this review? Our team will investigate.
            </Text>
            <TextInput
              style={styles.responseInput}
              placeholder="Reason for reporting (e.g., inappropriate content, spam, false information)"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.reportSubmitButton} onPress={handleReport}>
                <Text style={styles.reportSubmitButtonText}>Submit Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function VendorProfile() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const vendorReviews = useAppStore(s => s.vendorReviews);
  const respondToReview = useAppStore(s => s.respondToReview);
  const reportReview = useAppStore(s => s.reportReview);
  const hideReview = useAppStore(s => s.hideReview);
  const updateVendor = useAppStore(s => s.updateVendor);

  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);

  const currentVendor = vendors.find(v => v.email === user?.email);
  const currentReviews = vendorReviews.filter(r => r.vendorId === currentVendor?.id && r.isVisible);

  const [profileForm, setProfileForm] = useState({
    firstName: currentVendor?.firstName || "",
    lastName: currentVendor?.lastName || "",
    displayName: currentVendor?.displayName || "",
    businessName: currentVendor?.businessName || "",
    phone: currentVendor?.phone || "",
    bio: currentVendor?.profile?.bio || "",
    location: currentVendor?.profile?.location || "",
    businessHours: currentVendor?.profile?.businessHours || "",
  });

  if (!currentVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Vendor not found</Text>
      </SafeAreaView>
    );
  }

  const handleSaveProfile = () => {
    updateVendor(currentVendor.id, {
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      displayName: profileForm.displayName,
      businessName: profileForm.businessName,
      phone: profileForm.phone,
      profile: {
        ...currentVendor.profile,
        bio: profileForm.bio,
        location: profileForm.location,
        businessHours: profileForm.businessHours,
      }
    });
    setEditMode(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  const averageRating = currentReviews.length > 0 
    ? currentReviews.reduce((sum, r) => sum + r.rating, 0) / currentReviews.length 
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: currentReviews.filter(r => r.rating === star).length,
    percentage: currentReviews.length > 0 
      ? (currentReviews.filter(r => r.rating === star).length / currentReviews.length) * 100 
      : 0
  }));

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
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <Pressable 
          style={styles.editButton}
          onPress={() => setEditMode(!editMode)}
        >
          <Ionicons name={editMode ? "checkmark" : "pencil"} size={20} color="#f97316" />
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "profile" && styles.activeTab]}
          onPress={() => setActiveTab("profile")}
        >
          <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "reviews" && styles.activeTab]}
          onPress={() => setActiveTab("reviews")}
        >
          <Text style={[styles.tabText, activeTab === "reviews" && styles.activeTabText]}>
            Reviews ({currentReviews.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === "profile" && (
          <View style={styles.profileContent}>
            {/* Profile Overview */}
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Ionicons name="storefront" size={32} color="#3b82f6" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {currentVendor.displayName || `${currentVendor.firstName} ${currentVendor.lastName}`}
                  </Text>
                  <View style={styles.ratingRow}>
                    <StarRating rating={averageRating} size={20} />
                    <Text style={styles.ratingText}>
                      {averageRating.toFixed(1)} ({currentReviews.length} reviews)
                    </Text>
                  </View>
                  <Text style={styles.statusText}>Status: Approved</Text>
                </View>
              </View>
            </View>

            {/* Profile Form */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <TextInput
                    style={[styles.textInput, !editMode && styles.textInputDisabled]}
                    value={profileForm.firstName}
                    onChangeText={(text) => setProfileForm({...profileForm, firstName: text})}
                    editable={editMode}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <TextInput
                    style={[styles.textInput, !editMode && styles.textInputDisabled]}
                    value={profileForm.lastName}
                    onChangeText={(text) => setProfileForm({...profileForm, lastName: text})}
                    editable={editMode}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Display Name (How players find you)</Text>
                <TextInput
                  style={[styles.textInput, !editMode && styles.textInputDisabled]}
                  value={profileForm.displayName}
                  onChangeText={(text) => setProfileForm({...profileForm, displayName: text})}
                  placeholder="e.g. Lucky Numbers Atlanta"
                  editable={editMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Business Name</Text>
                <TextInput
                  style={[styles.textInput, !editMode && styles.textInputDisabled]}
                  value={profileForm.businessName}
                  onChangeText={(text) => setProfileForm({...profileForm, businessName: text})}
                  placeholder="Optional"
                  editable={editMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.textInput, !editMode && styles.textInputDisabled]}
                  value={profileForm.phone}
                  onChangeText={(text) => setProfileForm({...profileForm, phone: text})}
                  keyboardType="phone-pad"
                  editable={editMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Bio / Description</Text>
                <TextInput
                  style={[styles.textArea, !editMode && styles.textInputDisabled]}
                  value={profileForm.bio}
                  onChangeText={(text) => setProfileForm({...profileForm, bio: text})}
                  placeholder="Tell players about your service..."
                  multiline
                  numberOfLines={4}
                  editable={editMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput
                  style={[styles.textInput, !editMode && styles.textInputDisabled]}
                  value={profileForm.location}
                  onChangeText={(text) => setProfileForm({...profileForm, location: text})}
                  placeholder="e.g. Atlanta, GA"
                  editable={editMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Business Hours</Text>
                <TextInput
                  style={[styles.textInput, !editMode && styles.textInputDisabled]}
                  value={profileForm.businessHours}
                  onChangeText={(text) => setProfileForm({...profileForm, businessHours: text})}
                  placeholder="e.g. Mon-Fri 9AM-6PM"
                  editable={editMode}
                />
              </View>

              {editMode && (
                <View style={styles.saveButtonContainer}>
                  <Pressable style={styles.saveButton} onPress={handleSaveProfile}>
                    <Text style={styles.saveButtonText}>Save Profile</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Payment Methods Section */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Payment Methods</Text>
              <Text style={styles.sectionDescription}>
                Manage your payment methods for receiving payouts when you win
              </Text>
              <Pressable
                style={styles.paymentMethodsButton}
                onPress={() => (navigation as any).navigate("PaymentProfileScreen")}
              >
                <View style={styles.paymentMethodsButtonContent}>
                  <Ionicons name="wallet" size={24} color="#f97316" />
                  <View style={styles.paymentMethodsButtonText}>
                    <Text style={styles.paymentMethodsButtonTitle}>Manage Payment Methods</Text>
                    <Text style={styles.paymentMethodsButtonSubtitle}>
                      Add or update deposit and payout methods
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
              </Pressable>
            </View>
          </View>
        )}

        {activeTab === "reviews" && (
          <View style={styles.reviewsContent}>
            {/* Rating Overview */}
            <View style={styles.ratingOverviewCard}>
              <View style={styles.ratingOverview}>
                <View style={styles.averageRating}>
                  <Text style={styles.averageRatingNumber}>{averageRating.toFixed(1)}</Text>
                  <StarRating rating={Math.round(averageRating)} size={24} />
                  <Text style={styles.totalReviewsText}>{currentReviews.length} reviews</Text>
                </View>
                <View style={styles.ratingDistribution}>
                  {ratingDistribution.map((item) => (
                    <View key={item.star} style={styles.ratingDistributionRow}>
                      <Text style={styles.starNumber}>{item.star}</Text>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <View style={styles.progressBar}>
                        <View 
                          style={[styles.progressFill, { width: `${item.percentage}%` }]} 
                        />
                      </View>
                      <Text style={styles.ratingCount}>{item.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Reviews List */}
            <View style={styles.reviewsList}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              {currentReviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyReviewsTitle}>No Reviews Yet</Text>
                  <Text style={styles.emptyReviewsText}>
                    Start serving customers to receive your first reviews!
                  </Text>
                </View>
              ) : (
                currentReviews
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((review) => (
                    <ReviewItem
                      key={review.id}
                      review={review}
                      onRespond={respondToReview}
                      onReport={reportReview}
                      onHide={hideReview}
                    />
                  ))
              )}
            </View>
          </View>
        )}
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
    justifyContent: "space-between",
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
  editButton: {
    backgroundColor: "#fff7ed",
    padding: 8,
    borderRadius: 6,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  profileContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    backgroundColor: "#eff6ff",
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  statusText: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formGroup: {
    flex: 1,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  textInputDisabled: {
    backgroundColor: "#f9fafb",
    color: "#6b7280",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#1f2937",
    height: 80,
    textAlignVertical: "top",
  },
  saveButtonContainer: {
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: "#f97316",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  reviewsContent: {
    padding: 20,
  },
  ratingOverviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ratingOverview: {
    flexDirection: "row",
  },
  averageRating: {
    alignItems: "center",
    marginRight: 24,
  },
  averageRatingNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  totalReviewsText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  ratingDistribution: {
    flex: 1,
  },
  ratingDistributionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  starNumber: {
    width: 12,
    fontSize: 14,
    color: "#6b7280",
    marginRight: 4,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    marginHorizontal: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 4,
  },
  ratingCount: {
    width: 20,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "right",
  },
  reviewsList: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyReviews: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  playerAvatar: {
    backgroundColor: "#f3f4f6",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 8,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 8,
  },
  reviewActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
  },
  gamePlayInfo: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  gamePlayText: {
    fontSize: 12,
    color: "#6b7280",
  },
  reviewComment: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  vendorResponse: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    marginTop: 8,
  },
  vendorResponseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  vendorResponseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    marginLeft: 6,
    flex: 1,
  },
  vendorResponseDate: {
    fontSize: 11,
    color: "#6b7280",
  },
  vendorResponseText: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 18,
  },
  reportedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  reportedText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
    marginLeft: 4,
  },
  starContainer: {
    flexDirection: "row",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  responseInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginBottom: 16,
  },
  reportDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  postButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#f97316",
  },
  postButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  reportSubmitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#ef4444",
  },
  reportSubmitButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentMethodsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  paymentMethodsButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentMethodsButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodsButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  paymentMethodsButtonSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
});