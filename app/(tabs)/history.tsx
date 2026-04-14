import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

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

  const renderItem = ({ item }: { item: DonationRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <Ionicons name="calendar" size={20} color="#C0392B" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.hospitalName}>{item.hospital_name}</Text>
        <Text style={styles.dateText}>{item.donation_date}</Text>
      </View>
      <View style={styles.unitBadge}>
        <Text style={styles.unitVal}>{item.units_donated}</Text>
        <Text style={styles.unitLbl}>UNIT</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#4A0000", "#8B1A1A", "#C0392B"]}
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Your Impact</Text>
            <Ionicons name="medal" size={24} color="#FFD700" />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{stats.total}</Text>
              <Text style={styles.statLbl}>Donations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{stats.lives}</Text>
              <Text style={styles.statLbl}>Lives Impacted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal} numberOfLines={1}>{stats.last === "Never" ? "---" : stats.last.split("-")[2] + "/" + stats.last.split("-")[1]}</Text>
              <Text style={styles.statLbl}>Last Done</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={records}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} tintColor="#C0392B" />}
        ListHeaderComponent={<Text style={styles.listTitle}>Donation History</Text>}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="heart-dislike-outline" size={60} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>No donations yet</Text>
            <Text style={styles.emptySub}>Your kindness can save lives. Check the active requests and start your journey.</Text>
            <Pressable style={styles.viewReqBtn} onPress={() => router.push("/(tabs)")}>
              <Text style={styles.viewReqText}>View Active Requests</Text>
            </Pressable>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
  },
  statLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  dateText: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  unitBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  unitVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#C0392B",
  },
  unitLbl: {
    fontSize: 8,
    fontWeight: "800",
    color: "#888",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#444",
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  viewReqBtn: {
    backgroundColor: "#C0392B",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  viewReqText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
