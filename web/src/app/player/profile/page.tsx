"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { authAPI } from "@/lib/api/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Save, Loader2, Lock } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = { email: form.email, phone: form.phone };
      const res = await authAPI.updateProfile(updateData);
      if (res) {
        setUser({ ...user, ...updateData } as any);
      }
      toast.success(t("profileUpdated") || "Profile updated");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">My Profile</h1>
        </div>
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => editing ? handleSave() : setEditing(true)}
          loading={saving}
        >
          {editing ? <><Save className="h-4 w-4 mr-1" /> Save</> : "Edit"}
        </Button>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-6 rounded-full mb-3">
          <User className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h2>
        <p className="text-sm text-gray-500">{user?.role}</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <Lock className="h-3.5 w-3.5 text-red-500" />
            </div>
            <Input
              value={form.firstName}
              disabled={true}
              className="mt-1 bg-gray-50"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <Lock className="h-3.5 w-3.5 text-red-500" />
            </div>
            <Input
              value={form.lastName}
              disabled={true}
              className="mt-1 bg-gray-50"
            />
          </div>
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Lock className="h-3 w-3" /> {t("nameNotEditable") || "Name cannot be changed"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!editing}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={!editing}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {editing && (
        <Button
          className="w-full bg-green-600 hover:bg-green-700 rounded-2xl py-6 text-base"
          onClick={handleSave}
          loading={saving}
        >
          <Save className="h-5 w-5 mr-2" /> {t("saveChanges") || "Save Changes"}
        </Button>
      )}
    </div>
  );
}
