import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RequestCard } from "@/components/requests/RequestCard";
import { supabase } from "@/lib/supabase";
import { BloodRequest } from "@/lib/types";
import { useLocation } from "@/hooks/useLocation";
import { haversineDistance } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { coords, error: locError } = useLocation();
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const {
    setRequests,
    getFilteredAndSorted,
    filter,
    setFilter,
    isLoading,
    setIsLoading,
    sortBy,
    setSortBy,
  } = useRequestStore();
  const notifications = useNotificationStore((s) => s.notifications);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    const mapped = ((data ?? []) as BloodRequest[]).map((item) => ({
      ...item,
      distance:
        coords && item.latitude && item.longitude
          ? haversineDistance(coords.latitude, coords.longitude, item.latitude, item.longitude)
          : undefined,
    }));
    setRequests(mapped);
    setIsLoading(false);
  }, [coords, setIsLoading, setRequests]);

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel(`blood-requests-home-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blood_requests" }, () =>
        fetchRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const list = getFilteredAndSorted();
  const stats = useMemo(
    () => ({
      active: list.length,
      nearby: list.filter((r) => (r.distance ?? 999) <= 10).length,
      critical: list.filter((r) => r.urgency === "critical").length,
    }),
    [list]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Gradient */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#4A0000", "#8B1A1A", "#C0392B"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Hello, {profile?.full_name?.split(" ")[0] ?? "Donor"} 👋</Text>
              <Text style={styles.locationText}>
                {profile?.blood_group ?? "--"} • {profile?.city ?? "Unknown city"}
              </Text>
            </View>
            <Pressable 
              onPress={() => router.push("/notifications")}
              style={styles.profileBadge}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="notifications" size={24} color="#FFF" />
              {notifications.some(n => !n.is_read) && <View style={styles.badgeDot} />}
            </Pressable>
          </View>

          {/* Availability Alert */}
          {!profile?.is_available && (
            <Pressable 
              onPress={() => router.push("/(tabs)/profile")} 
              style={styles.availabilityAlert}
            >
              <Ionicons name="alert-circle" size={16} color="#FFF" />
              <Text style={styles.availabilityText}>You are currently away. Tap to update.</Text>
            </Pressable>
          )}

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats.nearby}</Text>
              <Text style={styles.statLabel}>Nearby</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats.critical}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Feed */}
      <View style={styles.feedContainer}>
        {/* Filter Bar */}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(["all", "normal", "urgent", "critical"] as const).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  filter === f && styles.filterChipActive,
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Sort Info */}
        <View style={styles.sortBar}>
          <Text style={styles.sortInfo}>
            Sort: <Text style={styles.sortValue}>{sortBy === "distance" ? "Nearest" : sortBy === "urgency" ? "Urgency" : "Newest"}</Text>
          </Text>
          <Pressable style={styles.sortBtn} onPress={() => setSortModalOpen(true)}>
            <Ionicons name="options-outline" size={18} color="#C0392B" />
            <Text style={styles.sortBtnText}>Sort</Text>
          </Pressable>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchRequests} tintColor="#C0392B" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No requests matching your filters.</Text>
            </View>
          }
          renderItem={({ item }) => <RequestCard request={item} />}
        />
      </View>

      {/* Create FAB */}
      <Pressable 
        style={styles.fab} 
        onPress={() => router.push("/requests/create")}
      >
        <LinearGradient
          colors={["#E74C3C", "#C0392B"]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>Create request</Text>
          <View style={styles.fabIconCircle}>
            <Ionicons name="add" size={20} color="#C0392B" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Sort Modal */}
      <Modal visible={sortModalOpen} transparent animationType="fade" onRequestClose={() => setSortModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSortModalOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {([
              ["distance", "Nearest Location", "navigate"],
              ["urgency", "Urgency Level", "alert-circle"],
              ["newest", "Posted Time", "time"],
            ] as const).map(([value, label, icon]) => (
              <Pressable
                key={value}
                style={[styles.modalOption, sortBy === value && styles.modalOptionActive]}
                onPress={() => {
                  setSortBy(value);
                  setSortModalOpen(false);
                }}
              >
                <Ionicons 
                  name={`${icon}${sortBy === value ? "" : "-outline"}`} 
                  size={20} 
                  color={sortBy === value ? "#C0392B" : "#666"} 
                />
                <Text style={[styles.modalOptionText, sortBy === value && styles.modalOptionTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

import { ScrollView } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerContainer: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  headerTop: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  locationText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    marginTop: 2,
  },
  profileBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  profileGroup: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 18,
  },
  badgeDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E74C3C",
    borderWidth: 2,
    borderColor: "#8B1A1A",
  },
  availabilityAlert: {
    marginHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  availabilityText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statsBar: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#C0392B",
  },
  statLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "#F0F0F0",
    alignSelf: "center",
  },
  feedContainer: {
    flex: 1,
    marginTop: 8,
  },
  filterWrapper: {
    paddingVertical: 16,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#EEE",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#C0392B",
    borderColor: "#C0392B",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  filterTextActive: {
    color: "#FFF",
  },
  sortBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sortInfo: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  sortValue: {
    color: "#C0392B",
    fontWeight: "800",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C0392B",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAA",
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    borderRadius: 28,
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fabText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 4,
  },
  fabIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 16,
    marginBottom: 10,
    backgroundColor: "#F8F9FA",
  },
  modalOptionActive: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
  },
  modalOptionTextActive: {
    color: "#C0392B",
    fontWeight: "800",
  },
});
