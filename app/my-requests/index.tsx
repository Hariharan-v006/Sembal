import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { BloodRequest, Profile } from "@/lib/types";

interface RequestWithResponses extends BloodRequest {
  responses: {
    donor_id: string;
    profile: Profile;
    status: string;
  }[];
}

export default function MyRequestsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const [requests, setRequests] = useState<RequestWithResponses[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchMyRequests();
  }, [profile?.id]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      // Fetch user's blood requests
      const { data: reqData, error: reqError } = await supabase
        .from("blood_requests")
        .select(`
          *,
          responses: donor_responses(
            donor_id,
            status,
            profile: profiles(*)
          )
        `)
        .eq("requester_id", profile?.id)
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;
      setRequests((reqData as any) || []);
    } catch (err: any) {
      console.error("Error fetching requests:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const callDonor = (phone: string) => {
    if (!phone) {
      Alert.alert("Error", "Phone number not available");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const renderRequest = ({ item }: { item: RequestWithResponses }) => {
    const acceptedDonors = item.responses.filter((r) => r.status === "accepted");

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.urgencySection}>
            <View style={[styles.urgencyDot, { backgroundColor: item.urgency === 'critical' ? '#C0392B' : item.urgency === 'urgent' ? '#E67E22' : '#27AE60' }]} />
            <Text style={styles.urgencyText}>{item.urgency.toUpperCase()}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.patientName}>{item.patient_name}</Text>
        <Text style={styles.hospitalName}>
          <Ionicons name="location-outline" size={14} color="#666" /> {item.hospital_name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodText}>{item.blood_group}</Text>
          </View>
          <Text style={styles.unitsText}>{item.units_needed} Units Needed</Text>
        </View>

        {acceptedDonors.length > 0 ? (
          <View style={styles.donorSection}>
            <Text style={styles.donorHeader}>Potential Donors ({acceptedDonors.length})</Text>
            {acceptedDonors.map((res, idx) => (
              <View key={idx} style={styles.donorRow}>
                <View style={styles.donorInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{res.profile?.full_name?.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.donorName}>{res.profile?.full_name}</Text>
                    <Text style={styles.donorMeta}>{res.profile?.blood_group} Donor · Ready to help</Text>
                  </View>
                </View>
                <Pressable 
                  style={styles.callSmallBtn}
                  onPress={() => callDonor(res.profile?.phone || "")}
                >
                  <Ionicons name="call" size={18} color="#FFF" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.waitingSection}>
            <Ionicons name="time" size={16} color="#999" />
            <Text style={styles.waitingText}>Waiting for responses...</Text>
          </View>
        )}

        <Pressable 
          style={styles.detailBtn}
          onPress={() => router.push(`/requests/${item.id}`)}
        >
          <Text style={styles.detailBtnText}>Manage Request</Text>
          <Ionicons name="arrow-forward" size={16} color="#C0392B" />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient 
        colors={["#1A1A1A", "#333"]} 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="journal-outline" size={60} color="#DDD" />
              </View>
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptySub}>Any blood requests you post will appear here.</Text>
              <Pressable 
                style={styles.createBtn}
                onPress={() => router.push("/requests/create")}
              >
                <Text style={styles.createBtnText}>Create a Request</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  card: { 
    backgroundColor: "#FFF", 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  urgencySection: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  urgencyText: { fontSize: 11, fontWeight: "800", color: "#666", letterSpacing: 0.5 },
  statusBadge: { backgroundColor: "#F0F0F0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "900", color: "#888" },
  patientName: { fontSize: 22, fontWeight: "900", color: "#1A1A1A" },
  hospitalName: { fontSize: 14, color: "#666", marginTop: 4, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  bloodBadge: { backgroundColor: "#C0392B", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bloodText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
  unitsText: { fontSize: 15, fontWeight: "700", color: "#444" },
  donorSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  donorHeader: { fontSize: 13, fontWeight: "800", color: "#C0392B", marginBottom: 15, textTransform: "uppercase" },
  donorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FDF2F2", padding: 12, borderRadius: 16, marginBottom: 8 },
  donorInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#C0392B", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  donorName: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  donorMeta: { fontSize: 12, color: "#666", fontWeight: "600" },
  callSmallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#27AE60", alignItems: "center", justifyContent: "center" },
  waitingSection: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, opacity: 0.6 },
  waitingText: { fontSize: 14, color: "#888", fontStyle: "italic" },
  detailBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 6, marginTop: 15 },
  detailBtnText: { fontSize: 14, fontWeight: "800", color: "#C0392B" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#1A1A1A" },
  emptySub: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, paddingHorizontal: 40 },
  createBtn: { backgroundColor: "#C0392B", paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, marginTop: 30 },
  createBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
});
