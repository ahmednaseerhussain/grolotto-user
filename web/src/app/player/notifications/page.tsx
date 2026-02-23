"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { notificationsAPI } from "@/lib/api/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ArrowLeft, Bell, CheckCheck, Loader2, Info, AlertTriangle, Gift, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const NOTIF_ICONS: Record<string, { icon: any; color: string }> = {
  info: { icon: Info, color: "text-blue-500 bg-blue-50" },
  warning: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50" },
  reward: { icon: Gift, color: "text-purple-500 bg-purple-50" },
  winning: { icon: Trophy, color: "text-emerald-500 bg-emerald-50" },
  default: { icon: Bell, color: "text-gray-500 bg-gray-50" },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const notifications = useAppStore((s) => s.notifications);
  const setNotifications = useAppStore((s) => s.setNotifications);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await notificationsAPI.getNotifications();
        setNotifications(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(
        notifications.map((n: any) => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(
        notifications.map((n: any) => n.id === id ? { ...n, read: true } : n)
      );
    } catch {}
  };

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12 text-gray-300" />}
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const iconConfig = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
            const IconComp = iconConfig.icon;
            return (
              <Card
                key={notif.id}
                className={`hover:shadow-sm transition-shadow cursor-pointer ${
                  !notif.read ? "border-l-4 border-l-emerald-500" : ""
                }`}
                onClick={() => handleMarkRead(notif.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2 rounded-full shrink-0 ${iconConfig.color}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.read ? "font-semibold" : "text-gray-700"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.message || notif.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notif.createdAt
                        ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                        : ""}
                    </p>
                  </div>
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
