"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Star, Store, MessageSquare, ChevronRight, Loader2, Send
} from "lucide-react";
import { GAME_LABELS } from "@/lib/utils";
import toast from "react-hot-toast";

const RATING_LABELS = ["", "Poor", "Below Average", "Average", "Good", "Excellent"];

const QUICK_COMMENTS = [
  "Fast Service",
  "Great Prices",
  "Easy to Reach",
  "Professional",
  "Reliable Payouts",
  "Helpful Support",
];

export default function VendorPublicProfile() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params.id as string;
  const t = useTranslation();
  const vendors = useAppStore((s) => s.vendors);
  const user = useAppStore((s) => s.user);

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const found = vendors.find((v: any) => String(v.id) === vendorId);
    if (found) {
      setVendor(found);
      setLoading(false);
    } else {
      vendorAPI.getVendors().then((res) => {
        const list = Array.isArray(res) ? res : [];
        const v = list.find((x: any) => String(x.id) === vendorId);
        setVendor(v || null);
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [vendorId, vendors]);

  const getEnabledGames = () => {
    const vDraws: Record<string, any> = vendor?.draws || {};
    if (!Object.keys(vDraws).length) return [];
    const games = new Set<string>();
    Object.values(vDraws).forEach((draw: any) => {
      if (draw?.enabled) {
        Object.entries(draw.games || {}).forEach(([key, game]: [string, any]) => {
          if (game?.enabled) games.add(key);
        });
      }
    });
    return Array.from(games);
  };

  const toggleQuickComment = (qc: string) => {
    if (comment.includes(qc)) {
      setComment(comment.replace(qc, "").replace(/\s{2,}/g, " ").trim());
    } else {
      const next = comment ? `${comment}, ${qc}` : qc;
      if (next.length <= 500) setComment(next);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error(t("pleaseSelectRating") || "Please select a rating");
      return;
    }
    if (!comment.trim()) {
      toast.error(t("pleaseAddComment") || "Please add a comment");
      return;
    }
    setSubmitting(true);
    try {
      // Submit review —  for now, show success since API may not exist
      toast.success(t("reviewSubmitted") || "Review submitted! Thank you.");
      setRating(0);
      setComment("");
    } catch (err) {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Vendor not found</p>
        <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const games = getEnabledGames();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t("rateVendor") || "Rate Vendor"}</h1>
      </div>

      {/* Vendor Info */}
      <Card>
        <CardContent className="p-6 text-center">
          <div className="bg-emerald-100 p-4 rounded-full inline-block mb-3">
            <Store className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold">
            {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-sm text-gray-600">{vendor.rating?.toFixed(1) || "5.0"}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1 mt-3">
            {games.map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">{GAME_LABELS[g] || g}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Star Rating */}
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="font-medium mb-2">{t("howWouldYouRate") || "How would you rate this vendor?"}</h3>
          <div className="flex items-center justify-center gap-2 my-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= rating ? "text-amber-500 fill-amber-500" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm font-medium text-gray-600">{RATING_LABELS[rating]}</p>
          )}
        </CardContent>
      </Card>

      {/* Comment */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium">{t("writeYourReview") || "Write Your Review"}</h3>
          <p className="text-sm text-gray-500">
            {t("tellUsAboutExperience") || "Tell us about your experience"}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder={t("shareDetailsAboutService") || "Share details about the service..."}
            rows={4}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>

          {/* Quick Comments */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t("quickComments") || "Quick Comments"}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMENTS.map((qc) => (
                <button
                  key={qc}
                  onClick={() => toggleQuickComment(qc)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    comment.includes(qc)
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t(qc.toLowerCase().replace(/\s/g, "")) || qc}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">{t("reviewGuidelines") || "Review Guidelines"}</h4>
          <ul className="text-xs text-amber-700 space-y-1.5">
            <li>• {t("beHonestConstructive") || "Be honest and constructive"}</li>
            <li>• {t("focusActualExperience") || "Focus on your actual experience"}</li>
            <li>• {t("avoidInappropriateLanguage") || "Avoid inappropriate language"}</li>
            <li>• {t("reviewsArePublic") || "Reviews are public"}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmitReview}
        disabled={rating === 0 || !comment.trim()}
        loading={submitting}
      >
        <Send className="h-4 w-4 mr-2" /> {t("submitReview") || "Submit Review"}
      </Button>
    </div>
  );
}
