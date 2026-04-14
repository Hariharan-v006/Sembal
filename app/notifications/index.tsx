import { useEffect } from "react";
import { FlatList, Pressable, Text, View, ActivityIndicator } from "react-native";
import { AppNotification, useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type NotificationListItem =
  | { kind: "section"; id: string; label: string }
  | { kind: "notification"; id: string; item: AppNotification };

const iconByType: Record<AppNotification["type"], { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  blood_request: { name: "water", bg: "bg-blue-100", color: "#2980B9" },
  sos: { name: "alert-circle", bg: "bg-red-100", color: "#C0392B" },
  response: { name: "checkmark-circle", bg: "bg-green-100", color: "#27AE60" },
  system: { name: "information-circle", bg: "bg-zinc-100", color: "#888888" },
};

const getDateLabel = (dateInput: string): string => {
  const date = new Date(dateInput);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.floor((startToday - startDate) / 86400000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff} days ago`;
};

export default function NotificationsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { notifications, setNotifications, markAllAsRead, markAsRead, addNotification } = useNotificationStore();

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotifications((data as AppNotification[]) ?? []));

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, (payload) => {
        addNotification(payload.new as AppNotification);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification, profile?.id, setNotifications]);

  const markAll = async () => {
    if (!profile?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    markAllAsRead();
  };

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#C0392B" />
      </View>
    );
  }

  const grouped = notifications.reduce<Record<string, AppNotification[]>>((acc, notification) => {
    const label = getDateLabel(notification.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(notification);
    return acc;
  }, {});
  const listData: NotificationListItem[] = Object.entries(grouped).flatMap(([label, items]) => [
    { kind: "section", id: `section-${label}`, label },
    ...items.map((item) => ({ kind: "notification" as const, id: item.id, item })),
  ]);

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-zinc-900">Notifications</Text>
        <Pressable onPress={markAll}>
          <Text className="text-[#C0392B]">Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 16, gap: 8 }}
        ListEmptyComponent={<Text className="text-center text-zinc-500">No notifications yet</Text>}
        renderItem={({ item }) => {
          if (item.kind === "section") {
            return <Text className="mt-1 text-xs font-semibold uppercase text-zinc-500">{item.label}</Text>;
          }
          const notification = item.item;
          const icon = iconByType[notification.type];
          return (
            <Pressable
              className={`rounded-xl border p-3 ${notification.is_read ? "border-zinc-200" : "border-red-200 bg-red-50"}`}
              onPress={async () => {
                markAsRead(notification.id);
                await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
                const requestId = (notification.data as { request_id?: string } | null)?.request_id;
                if (requestId) router.push(`/requests/${requestId}`);
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className={`h-10 w-10 items-center justify-center rounded-full ${icon.bg}`}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-zinc-900">{notification.title}</Text>
                  <Text className="text-sm text-zinc-600">{notification.body}</Text>
                </View>
                {!notification.is_read ? <View className="h-2 w-2 rounded-full bg-[#C0392B]" /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
