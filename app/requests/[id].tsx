import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { BloodRequest } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { formatTimeAgo } from "@/lib/utils";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

interface DonorResponse {
  id: string;
  donor_id: string;
  request_id: string;
  status: "pending" | "accepted" | "declined" | "completed";
  created_at: string;
}

export default function RequestDetails() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [responses, setResponses] = useState<DonorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const isRequester = request?.requester_id === profile?.id;
  const urgencyStyle: Record<string, string> = {
    normal: "bg-green-600",
    urgent: "bg-orange-500",
    critical: "bg-[#C0392B]",
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("blood_requests").select("*").eq("id", id).single();
      setRequest(data as BloodRequest);
      const { data: responsesData } = await supabase.from("donor_responses").select("*").eq("request_id", id);
      setResponses((responsesData as DonorResponse[]) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`request-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "donor_responses", filter: `request_id=eq.${id}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const accept = async () => {
    if (!profile?.id || !request) return;
    const { error } = await supabase.from("donor_responses").upsert({
      request_id: request.id,
      donor_id: profile.id,
      status: "accepted",
      responded_at: new Date().toISOString(),
    });
    if (error) return Alert.alert("Unable to accept", error.message);
    try {
      await invokeEdgeFunction("notify-donor-accepted", { request_id: request.id, donor_id: profile.id });
    } catch (edgeError) {
      Alert.alert("Accepted", `Accepted request, but notification failed: ${(edgeError as Error).message}`);
    }
    Alert.alert("Accepted", "You have accepted this request.");
    const { data } = await supabase.from("donor_responses").select("*").eq("request_id", request.id);
    setResponses((data as DonorResponse[]) ?? []);
  };

  const decline = async () => {
    if (!profile?.id || !request) return;
    const { error } = await supabase.from("donor_responses").upsert({
      request_id: request.id,
      donor_id: profile.id,
      status: "declined",
      responded_at: new Date().toISOString(),
    });
    if (error) return Alert.alert("Unable to decline", error.message);
    Alert.alert("Declined", "You declined this request.");
  };

  const markFulfilled = async () => {
    if (!request || !isRequester) return;
    const { error } = await supabase.from("blood_requests").update({ status: "fulfilled" }).eq("id", request.id);
    if (error) return Alert.alert("Unable to update request", error.message);
    Alert.alert("Completed", "Request marked as fulfilled.");
    setRequest((prev) => (prev ? { ...prev, status: "fulfilled" } : prev));
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#C0392B" />
      </View>
    );
  }

  const myResponse = responses.find((item) => item.donor_id === profile?.id);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.urgencyBadge, (styles as any)[`urgency_${request?.urgency ?? 'normal'}`]]}>
          <Text style={styles.urgencyText}>{(request?.urgency ?? "normal").toUpperCase()} REQUEST</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.patientName}>{request?.patient_name ?? "Patient"}</Text>
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodText}>{request?.blood_group}</Text>
            </View>
          </View>
          <Text style={styles.unitsText}>{request?.units_needed} units needed</Text>
          <Text style={styles.metaText}>Posted {request?.created_at ? formatTimeAgo(request.created_at) : "-"}</Text>
          {request?.expires_at ? <Text style={styles.metaText}>Expires {formatTimeAgo(request.expires_at)}</Text> : null}
          
          <View style={styles.divider} />
          
          <Text style={styles.infoText}>{request?.hospital_name}</Text>
          <Text style={[styles.infoText, { color: "#666", marginTop: 4 }]}>{request?.hospital_address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactVal}>{request?.contact_number}</Text>
          <Pressable
            style={styles.callBtn}
            onPress={() => {
              if (request?.contact_number) Linking.openURL(`tel:${request.contact_number}`);
            }}
          >
            <Ionicons name="call" size={18} color="#FFF" />
            <Text style={styles.callBtnText}>Call Now</Text>
          </Pressable>
        </View>

        {request?.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Medical Notes</Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        ) : null}

        {isRequester ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Responses ({responses.length})</Text>
            {responses.length === 0 ? <Text style={styles.emptyText}>No responses yet.</Text> : null}
            {responses.map((r) => (
              <View key={r.id} style={styles.responseItem}>
                <Ionicons name="person-circle" size={24} color="#C0392B" />
                <View style={styles.flex}>
                  <Text style={styles.donorId}>Donor {r.donor_id.slice(0, 6)}...</Text>
                  <Text style={styles.responseStatus}>{r.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}
            {request?.status !== "fulfilled" ? (
              <Pressable style={styles.matchBtn} onPress={markFulfilled}>
                <Text style={styles.matchBtnText}>Mark as Fulfilled</Text>
              </Pressable>
            ) : (
              <View style={styles.fulfilledBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
                <Text style={styles.fulfilledText}>This request is fulfilled.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.actionsCard}>
            {myResponse?.status === "accepted" ? (
              <View style={styles.acceptedBanner}>
                <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                <Text style={styles.acceptedText}>You have accepted this request.</Text>
              </View>
            ) : myResponse?.status === "declined" ? (
              <View style={styles.declinedBanner}>
                <Ionicons name="close-circle" size={24} color="#666" />
                <Text style={styles.declinedText}>You declined this request.</Text>
              </View>
            ) : (
              <View style={styles.donorBtns}>
                <Pressable style={styles.acceptBtn} onPress={accept}>
                  <Text style={styles.acceptBtnText}>Accept & Respond</Text>
                </Pressable>
                <Pressable style={styles.declineBtn} onPress={decline}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  urgencyBadge: { borderRadius: 10, paddingVertical: 6, alignItems: "center", marginBottom: 16 },
  urgency_normal: { backgroundColor: "#27AE60" },
  urgency_urgent: { backgroundColor: "#E67E22" },
  urgency_critical: { backgroundColor: "#C0392B" },
  urgencyText: { color: "#FFF", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 22, fontWeight: "900", color: "#1A1A1A" },
  bloodBadge: { backgroundColor: "#C0392B", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  bloodText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  unitsText: { fontSize: 15, fontWeight: "700", color: "#666", marginTop: 4 },
  metaText: { fontSize: 12, color: "#999", marginTop: 2, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 16 },
  infoText: { fontSize: 15, fontWeight: "600", color: "#444" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#888", marginBottom: 10, textTransform: "uppercase" },
  contactVal: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  callBtn: { backgroundColor: "#27AE60", height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 },
  callBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  notesText: { fontSize: 15, color: "#555", lineHeight: 22 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", marginVertical: 10 },
  responseItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#F9F9F9", borderRadius: 12, marginBottom: 8 },
  donorId: { fontSize: 14, fontWeight: "700", color: "#444" },
  responseStatus: { fontSize: 10, fontWeight: "900", color: "#C0392B" },
  matchBtn: { backgroundColor: "#27AE60", height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 },
  matchBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  fulfilledBanner: { backgroundColor: "#F0FDF4", padding: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  fulfilledText: { color: "#166534", fontWeight: "800", fontSize: 14 },
  actionsCard: { padding: 10 },
  donorBtns: { gap: 10 },
  acceptBtn: { backgroundColor: "#C0392B", height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  acceptBtnText: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  declineBtn: { height: 60, borderRadius: 20, borderWidth: 1.5, borderColor: "#C0392B", alignItems: "center", justifyContent: "center" },
  declineBtnText: { color: "#C0392B", fontSize: 17, fontWeight: "800" },
  acceptedBanner: { alignItems: "center", padding: 20, backgroundColor: "#F0FDF4", borderRadius: 24, gap: 10 },
  acceptedText: { color: "#166534", fontWeight: "800", fontSize: 15 },
  declinedBanner: { alignItems: "center", padding: 20, backgroundColor: "#F9F9F9", borderRadius: 24, gap: 10 },
  declinedText: { color: "#666", fontWeight: "800", fontSize: 15 },
});
