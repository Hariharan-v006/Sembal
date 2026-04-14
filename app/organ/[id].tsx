import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { OrganRequest, OrganDonorResponse } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export default function OrganDetailScreen() {
  const { id } = useLocalSearchParams();
  const profile = useAuthStore((s) => s.profile);
  const [request, setRequest] = useState<OrganRequest | null>(null);
  const [responses, setResponses] = useState<OrganDonorResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [userResponse, setUserResponse] = useState<OrganDonorResponse | null>(null);

  useEffect(() => {
    if (!id || !profile?.id) return;
    fetchDetail();
  }, [id, profile?.id]);

  const fetchDetail = async () => {
    const [reqRes, respRes] = await Promise.all([
      supabase.from("organ_requests").select("*, requester:profiles(*)").eq("id", id).single(),
      supabase.from("organ_donor_responses").select("*, donor:profiles(*)").eq("request_id", id),
    ]);

    if (reqRes.data) setRequest(reqRes.data as OrganRequest);
    if (respRes.data) {
      const allResps = respRes.data as OrganDonorResponse[];
      setResponses(allResps);
      const myResp = allResps.find(r => r.donor_id === profile?.id);
      if (myResp) setUserResponse(myResp);
    }
    setIsLoading(false);
  };

  const handleResponse = async (status: "accepted" | "declined") => {
    if (!profile?.id || !request) return;
    
    setIsResponding(true);
    const { data, error } = await supabase.from("organ_donor_responses").insert({
      request_id: request.id,
      donor_id: profile.id,
      status: status,
      message: status === "accepted" ? "I am willing to help." : "I cannot help at this time.",
    }).select().single();

    setIsResponding(false);
    if (error) return Alert.alert("Error", error.message);
    
    setUserResponse(data as OrganDonorResponse);
    Alert.alert("Response Sent", status === "accepted" ? "The requester has been notified." : "Thank you for your response.");
  };

  const updateRequestStatus = async (status: "matched" | "fulfilled" | "cancelled") => {
    if (!request) return;
    const { error } = await supabase.from("organ_requests").update({ status }).eq("id", request.id);
    if (error) return Alert.alert("Error", error.message);
    setRequest(prev => prev ? ({ ...prev, status }) : null);
    Alert.alert("Updated", `Request marked as ${status}.`);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8E44AD" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Request not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Return to Organ Hub</Text>
        </Pressable>
      </View>
    );
  }

  const isRequester = request.requester_id === profile?.id;
  const urgencyColors = { planned: "#27AE60", urgent: "#E67E22", critical: "#C0392B" };
  const accentColor = urgencyColors[request.urgency];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Organ Request</Text>
            {isRequester ? (
              <Pressable onPress={() => updateRequestStatus("cancelled")}>
                <Ionicons name="trash-outline" size={22} color="#FFF" />
              </Pressable>
            ) : <View style={{ width: 44 }} />}
          </View>
          
          <View style={styles.urgencyBanner}>
            <Text style={styles.urgencyTitle}>{request.urgency.toUpperCase()} NEED</Text>
            <Text style={styles.urgencySub}>{request.organ_needed} for {request.patient_name}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Patient Card */}
        <View style={styles.card}>
          <View style={styles.patientRow}>
            <View style={styles.patientAvatar}>
              <Text style={styles.avatarText}>{request.patient_name.charAt(0)}</Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{request.patient_name}</Text>
              <Text style={styles.patientMeta}>Age: {request.patient_age} · {request.patient_gender}</Text>
            </View>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodText}>{request.blood_group_needed}</Text>
            </View>
          </View>
          
          <View style={styles.organDisplay}>
            <View style={styles.organTag}>
              <Ionicons name="heart" size={16} color="#FFF" />
              <Text style={styles.organTagText}>{request.organ_needed}</Text>
            </View>
            <Text style={styles.deadlineText}>
              Needed {request.deadline ? `by ${new Date(request.deadline).toLocaleDateString()}` : "immediately (ASAP)"}
            </Text>
          </View>
        </View>

        {/* Hospital Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hospital Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={18} color="#8E44AD" />
            <Text style={styles.infoValue}>{request.hospital_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#999" />
            <Text style={[styles.infoValue, { color: "#666" }]}>{request.hospital_address}</Text>
          </View>
          
          <Pressable 
            style={styles.callBtn} 
            onPress={() => Linking.openURL(`tel:${request.contact_number}`)}
          >
            <Ionicons name="call" size={20} color="#FFF" />
            <Text style={styles.callBtnText}>CALL CONTACT</Text>
          </Pressable>
        </View>

        {/* Medical Notes */}
        {request.medical_notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Medical Notes</Text>
            <Text style={styles.notesText}>{request.medical_notes}</Text>
          </View>
        )}

        {/* Requester Profile */}
        <View style={styles.requesterCard}>
          <Text style={styles.requesterLabel}>Posted by</Text>
          <View style={styles.requesterInfo}>
            <Ionicons name="person-circle" size={40} color="#DDD" />
            <View style={styles.requesterTexts}>
              <Text style={styles.requesterName}>{request.requester?.full_name || "Unknown User"}</Text>
              <Text style={styles.timeText}>{new Date(request.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* CTA AREA */}
        <View style={styles.footer}>
          {isRequester ? (
            <View style={styles.requesterActions}>
              <Text style={styles.responsesTitle}>DONOR RESPONSES ({responses.length})</Text>
              {responses.map(res => (
                <View key={res.id} style={styles.responseRow}>
                  <View style={styles.resAvatar}>
                    <Text style={styles.resAvatarText}>{res.donor?.full_name?.charAt(0)}</Text>
                  </View>
                  <View style={styles.resContent}>
                    <Text style={styles.resName}>{res.donor?.full_name}</Text>
                    <Text style={styles.resStatus}>{res.status.toUpperCase()}</Text>
                  </View>
                  <Pressable onPress={() => Linking.openURL(`tel:${res.donor?.phone}`)}>
                    <Ionicons name="call" size={20} color="#27AE60" />
                  </Pressable>
                </View>
              ))}
              
              {request.status === "open" && responses.length > 0 && (
                <Pressable onPress={() => updateRequestStatus("matched")} style={styles.matchBtn}>
                  <Text style={styles.matchBtnText}>MARK AS MATCHED</Text>
                </Pressable>
              )}
              {request.status === "matched" && (
                <Pressable onPress={() => updateRequestStatus("fulfilled")} style={styles.fulfillBtn}>
                  <Text style={styles.fulfillBtnText}>MARK AS FULFILLED</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.donorActions}>
              {userResponse ? (
                <View style={[styles.statusBanner, { backgroundColor: userResponse.status === "accepted" ? "#E8F5E9" : "#F5F5F5" }]}>
                  <Ionicons 
                    name={userResponse.status === "accepted" ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={userResponse.status === "accepted" ? "#27AE60" : "#999"} 
                  />
                  <Text style={[styles.statusText, { color: userResponse.status === "accepted" ? "#27AE60" : "#666" }]}>
                    {userResponse.status === "accepted" ? "You've shared your intent to help" : "You declined this request"}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.donorPrompt}>Are you willing to help this patient?</Text>
                  <View style={styles.donorBtns}>
                    <Pressable 
                      style={[styles.btnAction, styles.btnWilling]} 
                      disabled={isResponding}
                      onPress={() => handleResponse("accepted")}
                    >
                      <Text style={styles.btnActionText}>I'M WILLING</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.btnAction, styles.btnDecline]} 
                      disabled={isResponding}
                      onPress={() => handleResponse("declined")}
                    >
                      <Text style={styles.btnDeclineText}>DECLINE</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingBottom: 24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  urgencyBanner: { alignItems: "center", marginTop: 10, paddingHorizontal: 40 },
  urgencyTitle: { fontSize: 13, fontWeight: "900", color: "rgba(255,255,255,0.8)", letterSpacing: 2 },
  urgencySub: { fontSize: 24, fontWeight: "900", color: "#FFF", textAlign: "center", marginTop: 4 },
  scrollContent: { padding: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 4 },
  patientRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  patientAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginRight: 16 },
  avatarText: { fontSize: 22, fontWeight: "900", color: "#8E44AD" },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 19, fontWeight: "800", color: "#1A1A1A" },
  patientMeta: { fontSize: 13, color: "#888", fontWeight: "600", marginTop: 2 },
  bloodCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFEBEE", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFCDD2" },
  bloodText: { fontSize: 14, fontWeight: "900", color: "#C0392B" },
  organDisplay: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  organTag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#8E44AD", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  organTagText: { color: "#FFF", fontSize: 13, fontWeight: "900" },
  deadlineText: { fontSize: 13, color: "#666", fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#444" },
  callBtn: { height: 54, borderRadius: 16, backgroundColor: "#27AE60", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 12 },
  callBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  notesText: { fontSize: 14, color: "#666", lineHeight: 22 },
  requesterCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, marginBottom: 32 },
  requesterLabel: { fontSize: 13, color: "#999", fontWeight: "700" },
  requesterInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  requesterTexts: { alignItems: "flex-end" },
  requesterName: { fontSize: 14, fontWeight: "800", color: "#444" },
  timeText: { fontSize: 12, color: "#AAA" },
  footer: { paddingBottom: 60 },
  donorPrompt: { fontSize: 16, fontWeight: "800", textAlign: "center", color: "#444", marginBottom: 16 },
  donorBtns: { flexDirection: "row", gap: 12 },
  btnAction: { flex: 1, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  btnWilling: { backgroundColor: "#8E44AD" },
  btnDecline: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EEE" },
  btnActionText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  btnDeclineText: { color: "#999", fontSize: 16, fontWeight: "800" },
  statusBanner: { padding: 20, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "center" },
  statusText: { fontSize: 14, fontWeight: "800" },
  responsesTitle: { fontSize: 12, fontWeight: "900", color: "#999", letterSpacing: 1, marginBottom: 16 },
  responseRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", padding: 12, borderRadius: 16, marginBottom: 10 },
  resAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" },
  resAvatarText: { fontWeight: "900", color: "#666" },
  resContent: { flex: 1 },
  resName: { fontSize: 14, fontWeight: "800", color: "#444" },
  resStatus: { fontSize: 10, color: "#27AE60", fontWeight: "900" },
  matchBtn: { height: 60, borderRadius: 20, backgroundColor: "#8E44AD", alignItems: "center", justifyContent: "center", marginTop: 24 },
  matchBtnText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  fulfillBtn: { height: 60, borderRadius: 20, backgroundColor: "#27AE60", alignItems: "center", justifyContent: "center", marginTop: 24 },
  fulfillBtnText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  errorText: { fontSize: 16, color: "#666" },
  backLink: { marginTop: 12 },
  backLinkText: { color: "#8E44AD", fontWeight: "800" },
});
