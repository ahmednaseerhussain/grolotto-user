"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { authAPI } from "@/lib/api/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  ArrowLeft, Edit2, Save, Star, User, Phone, Mail, MapPin,
  Store, Globe, Loader2, Camera, MessageCircle, Flag, EyeOff, Send, X
} from "lucide-react";
import toast from "react-hot-toast";

export default function VendorProfileScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const vendorProfile = useAppStore((s) => s.vendorProfile);
  const setVendorProfile = useAppStore((s) => s.setVendorProfile);

  const [activeTab, setActiveTab] = useState<"profile" | "reviews">("profile");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyModal, setReplyModal] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [reportModal, setReportModal] = useState<any>(null);

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    description: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await vendorAPI.getProfile();
      const p = res.data?.vendor || res.data;
      setProfile(p);
      if (p) {
        setForm({
          businessName: p.businessName || "",
          ownerName: p.ownerName || p.firstName || "",
          email: p.email || "",
          phone: p.phone || "",
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          description: p.description || "",
        });
        setReviews(p.reviews || []);
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await vendorAPI.updateProfile(form);
      toast.success(t("profileUpdated") || "Profile updated!");
      setEditing(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !replyModal) return;
    try {
      await vendorAPI.respondToReview(replyModal.id, replyText);
      toast.success("Reply sent!");
      setReplyModal(null);
      setReplyText("");
      fetchProfile();
    } catch {
      toast.error("Failed to reply");
    }
  };

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length;
  }, [reviews]);

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r: any) => {
      const idx = Math.round(r.rating || 0) - 1;
      if (idx >= 0 && idx < 5) dist[idx]++;
    });
    return dist;
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t("vendorProfile") || "Vendor Profile"}</h1>
      </div>

      {/* Profile Banner */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {(profile?.businessName || "V")[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{profile?.businessName || "My Business"}</h2>
              <p className="text-sm opacity-80">{profile?.ownerName || user?.firstName || ""}</p>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-white/40"}`}
                  />
                ))}
                <span className="text-sm ml-1">{avgRating.toFixed(1)}</span>
                <span className="text-xs opacity-60 ml-1">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(["profile", "reviews"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "profile" ? (t("profile") || "Profile") : (t("reviews") || "Reviews")}
          </button>
        ))}
      </div>

      {activeTab === "profile" ? (
        <>
          {/* Profile Form */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t("businessInfo") || "Business Information"}</h3>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> {t("edit") || "Edit"}
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleSave} loading={saving}>
                      <Save className="h-3.5 w-3.5 mr-1" /> {t("save") || "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                )}
              </div>

              {[
                { key: "businessName", label: t("businessName") || "Business Name", icon: Store },
                { key: "ownerName", label: t("ownerName") || "Owner Name", icon: User },
                { key: "email", label: t("email") || "Email", icon: Mail },
                { key: "phone", label: t("phone") || "Phone", icon: Phone },
                { key: "address", label: t("address") || "Address", icon: MapPin },
                { key: "city", label: t("city") || "City", icon: Globe },
                { key: "state", label: t("state") || "State", icon: Globe },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key}>
                  <label className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </label>
                  {editing ? (
                    <Input
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-0.5">{(form as any)[key] || "-"}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="text-sm text-gray-500">{t("description") || "Description"}</label>
                {editing ? (
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-gray-200 p-2 text-sm h-20 resize-none"
                  />
                ) : (
                  <p className="text-sm mt-0.5">{form.description || "-"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Rating Distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{t("ratingDistribution") || "Rating Distribution"}</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingDist[stars - 1];
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-right">{stars}</span>
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-gray-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="p-6 text-center text-gray-400">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t("noReviews") || "No reviews yet"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                          {(review.playerName || "P")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{review.playerName || "Player"}</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i <= (review.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-gray-700 mb-2">{review.comment}</p>}
                    {review.response && (
                      <div className="bg-emerald-50 p-2 rounded text-sm">
                        <p className="text-xs font-medium text-emerald-700 mb-0.5">{t("yourResponse") || "Your response"}</p>
                        <p className="text-emerald-800 text-sm">{review.response}</p>
                      </div>
                    )}
                    {!review.response && (
                      <div className="flex gap-1 mt-2">
                        <Button variant="outline" size="sm" onClick={() => { setReplyModal(review); setReplyText(""); }}>
                          <Send className="h-3 w-3 mr-1" /> Reply
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setReportModal(review)}>
                          <Flag className="h-3 w-3 mr-1" /> Report
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Reply Dialog */}
          <Dialog open={!!replyModal} onOpenChange={() => setReplyModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("replyToReview") || "Reply to Review"}</DialogTitle>
              </DialogHeader>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="w-full rounded-lg border border-gray-200 p-3 text-sm h-24 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right">{replyText.length}/500</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReplyModal(null)}>Cancel</Button>
                <Button onClick={handleReply} disabled={!replyText.trim()}>Send Reply</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Report Dialog */}
          <Dialog open={!!reportModal} onOpenChange={() => setReportModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("reportReview") || "Report Review"}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600">
                {t("reportReviewText") || "This review will be flagged for admin review. Are you sure?"}
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReportModal(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { toast.success("Review reported"); setReportModal(null); }}>
                  Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
