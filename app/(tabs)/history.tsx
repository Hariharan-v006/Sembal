import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface DonationRecord {
  id: string;
  hospital_name: string;
  donation_date: string;
  units_donated: number;
}

export default function HistoryScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [records, setRecords] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    supabase
      .from("donation_records")
      .select("id,hospital_name,donation_date,units_donated")
      .eq("donor_id", profile.id)
      .order("donation_date", { ascending: false })
      .then(({ data }) => {
        setRecords((data as DonationRecord[]) ?? []);
        setLoading(false);
      });
  }, [profile?.id]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const stats = useMemo(() => {
    const totalUnits = records.reduce((sum, row) => sum + row.units_donated, 0);
    return {
      total: records.length,
      lives: totalUnits * 3,
      last: records[0]?.donation_date ?? "Never",
    };
  }, [records]);

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <View className="flex-row gap-2 px-4 py-3">
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-2xl font-bold text-[#C0392B]">{stats.total}</Text>
          <Text className="text-xs text-zinc-600">Total Donations</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-2xl font-bold text-[#C0392B]">{stats.lives}</Text>
          <Text className="text-xs text-zinc-600">Lives Impacted</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-base font-bold text-[#C0392B]">{stats.last}</Text>
          <Text className="text-xs text-zinc-600">Last Donation</Text>
        </View>
      </View>
      <FlatList
        data={records}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} tintColor="#C0392B" />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-lg font-semibold text-zinc-700">No donations yet</Text>
            <Text className="mt-1 text-sm text-zinc-500">Accept a blood request to log your first donation.</Text>
            <Pressable className="mt-4 rounded-xl bg-[#C0392B] px-4 py-2" onPress={() => router.push("/(tabs)")}>
              <Text className="text-white">View Requests</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View className="rounded-xl bg-white p-4">
            <Text className="font-semibold text-zinc-900">{item.hospital_name}</Text>
            <Text className="text-sm text-zinc-600">{item.donation_date}</Text>
            <Text className="text-sm text-zinc-600">{item.units_donated} unit(s)</Text>
          </View>
        )}
      />
    </View>
  );
}
