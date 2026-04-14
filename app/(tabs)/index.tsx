import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RequestCard } from "@/components/requests/RequestCard";
import { supabase } from "@/lib/supabase";
import { BloodRequest } from "@/lib/types";
import { useLocation } from "@/hooks/useLocation";
import { haversineDistance } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { coords, error } = useLocation();
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const { setRequests, getFilteredAndSorted, filter, setFilter, isLoading, setIsLoading, sortBy, setSortBy } =
    useRequestStore();

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("blood_requests").select("*").eq("status", "open").order("created_at", { ascending: false });
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
      .channel("blood-requests-home")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blood_requests" }, () => fetchRequests())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const list = getFilteredAndSorted();
  const stats = useMemo(
    () => ({
      active: list.filter((r) => r.status === "open").length,
      nearby: list.filter((r) => (r.distance ?? 999) <= 10).length,
      critical: list.filter((r) => r.urgency === "critical").length,
    }),
    [list],
  );

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <View className="px-4 py-3">
        <Text className="text-lg font-semibold text-zinc-900">Hello, {profile?.full_name?.split(" ")[0] ?? "Donor"} 👋</Text>
        <Text className="text-sm text-zinc-600">{profile?.blood_group ?? "--"} · {profile?.city ?? "Unknown city"}</Text>
        {error ? <Text className="mt-2 text-xs text-orange-600">{error} - distance sorting unavailable</Text> : null}
        {!profile?.is_available ? (
          <Pressable onPress={() => router.push("/(tabs)/profile")} className="mt-2 rounded-xl bg-red-50 p-3">
            <Text className="text-xs text-[#C0392B]">You are currently unavailable. Tap to update profile.</Text>
          </Pressable>
        ) : null}
      </View>
      <View className="mb-2 flex-row gap-2 px-4">
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-lg font-bold text-[#C0392B]">{stats.active}</Text>
          <Text className="text-xs text-zinc-600">Active Requests</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-lg font-bold text-[#C0392B]">{stats.nearby}</Text>
          <Text className="text-xs text-zinc-600">Donors Nearby</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-lg font-bold text-[#C0392B]">{stats.critical}</Text>
          <Text className="text-xs text-zinc-600">Critical</Text>
        </View>
      </View>
      <View className="mb-2 flex-row gap-2 px-4">
        {(["all", "normal", "urgent", "critical"] as const).map((f) => (
          <Pressable key={f} className={`rounded-full border px-3 py-1 ${filter === f ? "border-[#C0392B] bg-[#C0392B]" : "border-zinc-300 bg-white"}`} onPress={() => setFilter(f)}>
            <Text className={`text-xs ${filter === f ? "text-white" : "text-zinc-600"}`}>{f.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mb-2 flex-row items-center justify-between px-4">
        <Text className="text-xs text-zinc-500">
          Sorted by {sortBy === "distance" ? "distance" : sortBy === "urgency" ? "urgency" : "newest"}
        </Text>
        <Pressable className="rounded-full border border-zinc-300 px-3 py-1" onPress={() => setSortModalOpen(true)}>
          <Text className="text-xs text-zinc-600">Change sort</Text>
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchRequests} tintColor="#C0392B" />}
        ListEmptyComponent={<Text className="mt-10 text-center text-zinc-500">No active requests found.</Text>}
        renderItem={({ item }) => <RequestCard request={item} />}
      />
      <Pressable className="absolute bottom-7 right-6 h-14 w-14 items-center justify-center rounded-full bg-[#C0392B]" onPress={() => router.push("/requests/create")}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
      <Modal visible={sortModalOpen} transparent animationType="fade" onRequestClose={() => setSortModalOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-6" onPress={() => setSortModalOpen(false)}>
          <View className="w-full rounded-xl bg-white p-4">
            <Text className="mb-3 text-base font-semibold text-zinc-900">Sort Requests</Text>
            {([
              ["distance", "Nearest first"],
              ["urgency", "Most urgent first"],
              ["newest", "Newest first"],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                className={`mb-2 rounded-lg border px-3 py-2 ${sortBy === value ? "border-[#C0392B] bg-red-50" : "border-zinc-200"}`}
                onPress={() => {
                  setSortBy(value);
                  setSortModalOpen(false);
                }}
              >
                <Text className={sortBy === value ? "text-[#C0392B]" : "text-zinc-700"}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
