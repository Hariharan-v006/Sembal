import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification, useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

type NotificationListItem =
  | { kind: "section"; id: string; label: string }
  | { kind: "notification"; id: string; item: AppNotification };

const themeByType: Record<
  AppNotification["type"],
  { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  blood_request: { name: "water", color: "#3498DB", bg: "#EBF5FB" },
  sos: { name: "alert-circle", color: "#C0392B", bg: "#FDEDEC" },
  response: { name: "checkmark-circle", color: "#27AE60", bg: "#E9F7EF" },
  organ_request: { name: "heart", color: "#8E44AD", bg: "#F3E8FF" },
  organ_response: { name: "checkmark-circle-outline", color: "#8E44AD", bg: "#F3E8FF" },
  system: { name: "information-circle", color: "#8E44AD", bg: "#F5EEF8" },
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
  const insets = useSafeAreaInsets();
  const { notifications, setNotifications, markAllAsRead, markAsRead, addNotification } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.id) return;
    
    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });
        
        if (isMounted) {
          if (error) console.error("Notifications fetch error:", error);
          setNotifications((data as AppNotification[]) ?? []);
        }
      } catch (err) {
        console.error("Notifications query failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitial();

    const channel = supabase
      .channel(`notifications-${profile.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (isMounted) addNotification(payload.new as AppNotification);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [profile?.id]); // Only re-run if profile switches

  const markAll = async () => {
    if (!profile?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    markAllAsRead();
  };

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

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C0392B" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient 
        colors={["#1A1A1A", "#333"]} 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Updates</Text>
            <Text style={styles.headerSub}>{notifications.filter(n => !n.is_read).length} new alerts</Text>
          </View>
          <Pressable onPress={markAll} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={64} color="#EEE" />
            <Text style={styles.emptyText}>All caught up!</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "section") {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{item.label}</Text>
                <View style={styles.sectionLine} />
              </View>
            );
          }
          const notification = item.item;
          const theme = themeByType[notification.type] || themeByType.system;
          
          return (
            <Pressable
              style={[styles.card, !notification.is_read && styles.cardUnread]}
              onPress={async () => {
                markAsRead(notification.id);
                await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
                
                const data = notification.data as Record<string, any> | null;
                if (notification.type === "organ_request" || notification.type === "organ_response") {
                  const organId = data?.organ_request_id || data?.id;
                  if (organId) router.push(`/organ/${organId}`);
                } else {
                  const requestId = data?.request_id;
                  if (requestId) router.push(`/requests/${requestId}`);
                }
              }}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconBox, { backgroundColor: theme.bg }]}>
                  <Ionicons name={theme.name} size={22} color={theme.color} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.title, !notification.is_read && styles.titleBold]}>{notification.title}</Text>
                  <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
                </View>
                {!notification.is_read && <View style={styles.unreadDot} />}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFD" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFF", letterSpacing: -1 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "700" },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" },
  markAllText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  listContainer: { padding: 20, paddingBottom: 100 },
  emptyWrap: { alignItems: "center", marginTop: 100, gap: 16 },
  emptyText: { fontSize: 16, color: "#CCC", fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 16, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "900", color: "#AAA", textTransform: "uppercase", letterSpacing: 1 },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#F0F0F0" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: "#FFF",
    borderColor: "#FFEBEE",
    borderLeftWidth: 4,
    borderLeftColor: "#C0392B",
  },
  cardContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBox: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", marginBottom: 2 },
  titleBold: { fontWeight: "800" },
  body: { fontSize: 13, color: "#666", lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#C0392B" },
});
