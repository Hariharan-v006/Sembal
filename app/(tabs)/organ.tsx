import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  TextInput,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ORGANS, COLORS } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useOrganStore } from "@/stores/organStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { OrganRequestCard } from "@/components/organ/OrganRequestCard";
import { OrganRequest, OrganUrgency } from "@/lib/types";
import { useLocation } from "@/hooks/useLocation";

const { width } = Dimensions.get("window");

export default function OrganHubScreen() {
  const profile = useAuthStore((s) => s.profile);
  const insets = useSafeAreaInsets();
  const { 
    organRequests, 
    setOrganRequests, 
    addOrganRequest, 
    organFilter, 
    setOrganFilter, 
    urgencyFilter, 
    setUrgencyFilter,
    getFiltered 
  } = useOrganStore();
  const { coords, getLocation } = useLocation();

  const [activeSegment, setActiveSegment] = useState<"requests" | "preference">("requests");
  
  // Section B state (Preference)
  const [donorEnabled, setDonorEnabled] = useState(false);
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>([]);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Section A state (Requests)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Request State
  const [newRequest, setNewRequest] = useState({
    patient_name: "",
    patient_age: "",
    patient_gender: "male" as "male" | "female" | "other",
    organ_needed: "Kidneys",
    blood_group_needed: "O+",
    urgency: "urgent" as OrganUrgency,
    hospital_name: "",
    hospital_address: "",
    contact_number: "",
    medical_notes: "",
  });

  useEffect(() => {
    if (!profile?.id) return;
    
    // Initial data fetch
    fetchData();

    // Subscribe to realtime
    const channel = supabase
      .channel("organ-requests-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "organ_requests" },
        (payload) => addOrganRequest(payload.new as OrganRequest)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchData = async () => {
    if (!profile?.id) return;
    
    // 1. Fetch Requests
    const { data: requests } = await supabase
      .from("organ_requests")
      .select("*, requester:profiles(*)")
      .order("created_at", { ascending: false });
    
    if (requests) setOrganRequests(requests);

    // 2. Fetch User Donor Preferences
    const { data: consent } = await supabase
      .from("organ_donation_consents")
      .select("*")
      .eq("user_id", profile.id)
      .single();

    if (consent) {
      setDonorEnabled(Boolean(consent.is_donor));
      setSelectedOrgans(consent.organs ?? []);
      setConsentDate(consent.consent_date ?? null);
    }
    
    setIsInitializing(false);
  };

  const savePreferences = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    const nextConsentDate = donorEnabled ? new Date().toISOString().slice(0, 10) : null;
    const { error } = await supabase.from("organ_donation_consents").upsert({
      user_id: profile.id,
      is_donor: donorEnabled,
      organs: donorEnabled ? selectedOrgans : [],
      consent_date: nextConsentDate,
    });
    
    setIsSaving(false);
    if (error) return Alert.alert("Error", error.message);
    
    setConsentDate(nextConsentDate);
    Alert.alert("Hero Choice Saved", "Your donation preferences are updated.");
  };

  const handleCreateRequest = async () => {
    if (!profile?.id) return;
    
    // Simple validation
    if (!newRequest.patient_name || !newRequest.hospital_name || !newRequest.hospital_address) {
      return Alert.alert("Missing Info", "Please fill in all required patient and hospital details.");
    }

    let currentCoords = coords;
    if (!currentCoords) currentCoords = await getLocation();
    
    if (!currentCoords) {
      return Alert.alert("Location Required", "We need your location to alert nearby donors.");
    }

    const { error } = await supabase.from("organ_requests").insert({
      requester_id: profile.id,
      patient_name: newRequest.patient_name,
      patient_age: parseInt(newRequest.patient_age) || 30,
      patient_gender: newRequest.patient_gender,
      organ_needed: newRequest.organ_needed,
      blood_group_needed: newRequest.blood_group_needed,
      urgency: newRequest.urgency,
      hospital_name: newRequest.hospital_name,
      hospital_address: newRequest.hospital_address,
      contact_number: newRequest.contact_number || profile.phone || "",
      medical_notes: newRequest.medical_notes,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      status: "open",
    });

    if (error) return Alert.alert("Fail", error.message);

    setShowCreateModal(false);
    Alert.alert("Request Posted", "We've notified registered donors of your choice within 100km.");
  };

  const filteredRequests = getFiltered();

  const RequestListHeader = () => (
    <View style={styles.feedHeader}>
      <View style={styles.statsStrip}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{organRequests.filter(r => r.status === 'open').length}</Text>
          <Text style={styles.statLabel}>Open Requests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>80+</Text>
          <Text style={styles.statLabel}>Donors Online</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {["all", ...ORGANS].map((o) => (
          <Pressable
            key={o}
            onPress={() => setOrganFilter(o)}
            style={[styles.filterChip, organFilter === o && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, organFilter === o && styles.textWhite]}>{o}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.urgencyBar}>
        {(["all", "planned", "urgent", "critical"] as const).map((u) => (
          <Pressable
            key={u}
            onPress={() => setUrgencyFilter(u)}
            style={[styles.urgencyChip, urgencyFilter === u && styles[`urgencyChip_${u}` as keyof typeof styles]]}
          >
            <Text style={[styles.urgencyChipText, urgencyFilter === u && styles.textWhite]}>
              {u.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8E44AD" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.switcher}>
          <Pressable 
            onPress={() => setActiveSegment("requests")}
            style={[styles.switchBtn, activeSegment === "requests" && styles.switchBtnActive]}
          >
            <Text style={[styles.switchText, activeSegment === "requests" && styles.switchTextActive]}>Requests</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveSegment("preference")}
            style={[styles.switchBtn, activeSegment === "preference" && styles.switchBtnActive]}
          >
            <Text style={[styles.switchText, activeSegment === "preference" && styles.switchTextActive]}>My Preference</Text>
          </Pressable>
        </View>

        {activeSegment === "requests" ? (
          <View style={styles.flex}>
            <FlatList
              data={filteredRequests}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={RequestListHeader}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <OrganRequestCard 
                  request={item} 
                  isRegisteredDonor={donorEnabled && selectedOrgans.includes(item.organ_needed)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="heart-dislike-outline" size={64} color="#F3E8FF" />
                  <Text style={styles.emptyTitle}>No matching requests</Text>
                  <Text style={styles.emptySub}>Check back later or change your filters.</Text>
                </View>
              }
            />
            
            <Pressable style={styles.fab} onPress={() => setShowCreateModal(true)}>
              <LinearGradient colors={["#9B59B6", "#8E44AD"]} style={styles.fabGradient}>
                <Ionicons name="add" size={32} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.preferenceScroll}>
            <View style={styles.prefHero}>
              <View style={styles.heroCircle}>
                <Ionicons name="heart" size={50} color="#8E44AD" />
              </View>
              <Text style={styles.heroTitle}>Life Givers Club</Text>
              <Text style={styles.heroSub}>Your decision today gives hope for tomorrow. One donor can save multiple lives.</Text>
            </View>

            <View style={styles.prefCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Organ Donor Consent</Text>
                  <Text style={styles.toggleSub}>Enabled donors are visible to patients</Text>
                </View>
                <Pressable 
                  onPress={() => setDonorEnabled(!donorEnabled)}
                  style={[styles.toggleBase, donorEnabled && styles.toggleActive]}
                >
                  <View style={[styles.toggleThumb, donorEnabled && styles.toggleThumbActive]} />
                </Pressable>
              </View>

              {donorEnabled && (
                <View style={styles.organSection}>
                  <View style={styles.organHeader}>
                    <Text style={styles.organTitle}>Consent for Organs/Tissues</Text>
                    <Pressable onPress={() => setSelectedOrgans(selectedOrgans.length === ORGANS.length ? [] : [...ORGANS])}>
                      <Text style={styles.selectAllLink}>{selectedOrgans.length === ORGANS.length ? "Deselect All" : "Select All"}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.organGrid}>
                    {ORGANS.map((o) => (
                      <Pressable 
                        key={o}
                        onPress={() => setSelectedOrgans(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])}
                        style={[styles.organChip, selectedOrgans.includes(o) && styles.organChipActive]}
                      >
                        <Text style={[styles.organChipText, selectedOrgans.includes(o) && styles.textOrgan]}>{o}</Text>
                        {selectedOrgans.includes(o) && <Ionicons name="checkmark-circle" size={14} color="#8E44AD" />}
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.legalBox}>
              <Ionicons name="information-circle-outline" size={18} color="#999" />
              <Text style={styles.legalText}>
                By saving, you verify your intent to be a donor. This preference is shared with verified medical facilities in emergencies.
              </Text>
            </View>

            {consentDate && (
              <View style={styles.historyBox}>
                <Ionicons name="calendar" size={16} color="#27AE60" />
                <Text style={styles.historyText}>Registered on {new Date(consentDate).toLocaleDateString()}</Text>
              </View>
            )}

            <Pressable 
              style={[styles.saveBtn, isSaving && styles.btnDisabled]} 
              onPress={savePreferences}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>{isSaving ? "SAVING..." : "SAVE PREFERENCES"}</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Create Request Modal */}
        <Modal visible={showCreateModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Organ Request</Text>
                <Pressable onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>PATIENT NAME</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="Enter full name"
                    value={newRequest.patient_name}
                    onChangeText={t => setNewRequest(prev => ({ ...prev, patient_name: t }))}
                  />
                </View>

                <View style={styles.modalRow}>
                  <View style={[styles.modalSection, { flex: 1 }]}>
                    <Text style={styles.modalLabel}>AGE</Text>
                    <TextInput 
                      style={styles.modalInput} 
                      placeholder="e.g. 35"
                      keyboardType="numeric"
                      value={newRequest.patient_age}
                      onChangeText={t => setNewRequest(prev => ({ ...prev, patient_age: t }))}
                    />
                  </View>
                  <View style={[styles.modalSection, { flex: 1.5, marginLeft: 16 }]}>
                    <Text style={styles.modalLabel}>GENDER</Text>
                    <View style={styles.pillRow}>
                      {(["male", "female", "other"] as const).map(g => (
                        <Pressable 
                          key={g}
                          onPress={() => setNewRequest(prev => ({ ...prev, patient_gender: g }))}
                          style={[styles.smallPill, newRequest.patient_gender === g && styles.smallPillActive]}
                        >
                          <Text style={[styles.smallPillText, newRequest.patient_gender === g && styles.textWhite]}>
                            {g.charAt(0).toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>ORGAN NEEDED</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                    {ORGANS.map(o => (
                      <Pressable 
                        key={o}
                        onPress={() => setNewRequest(prev => ({ ...prev, organ_needed: o }))}
                        style={[styles.organPill, newRequest.organ_needed === o && styles.organPillActive]}
                      >
                        <Text style={[styles.organPillText, newRequest.organ_needed === o && styles.textWhite]}>{o}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>URGENCY</Text>
                  <View style={styles.urgencyPills}>
                    {(["planned", "urgent", "critical"] as const).map(u => (
                      <Pressable 
                        key={u}
                        onPress={() => setNewRequest(prev => ({ ...prev, urgency: u }))}
                        style={[styles.uPill, newRequest.urgency === u && styles[`uPill_${u}` as keyof typeof styles]]}
                      >
                        <Text style={[styles.uPillText, newRequest.urgency === u && styles.textWhite]}>{u.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>HOSPITAL NAME</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="Search hospital..."
                    value={newRequest.hospital_name}
                    onChangeText={t => setNewRequest(prev => ({ ...prev, hospital_name: t }))}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>HOSPITAL ADDRESS</Text>
                  <TextInput 
                    style={[styles.modalInput, styles.modalArea]} 
                    multiline
                    placeholder="Full address of the hospital"
                    value={newRequest.hospital_address}
                    onChangeText={t => setNewRequest(prev => ({ ...prev, hospital_address: t }))}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>MEDICAL NOTES (OPTIONAL)</Text>
                  <TextInput 
                    style={[styles.modalInput, styles.modalArea]} 
                    multiline
                    placeholder="Tissue type, special medical instructions..."
                    value={newRequest.medical_notes}
                    onChangeText={t => setNewRequest(prev => ({ ...prev, medical_notes: t }))}
                  />
                </View>

                <Pressable style={styles.submitBtn} onPress={handleCreateRequest}>
                  <Text style={styles.submitBtnText}>POST ORGAN REQUEST</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  switcher: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 4,
  },
  switchBtn: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  switchBtnActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  switchText: { fontSize: 13, fontWeight: "700", color: "#888" },
  switchTextActive: { color: "#1A1A1A" },
  
  // Section A - Requests
  feedHeader: { padding: 20 },
  statsStrip: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#F0F0F0", alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "900", color: "#8E44AD" },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#999", textTransform: "uppercase", marginTop: 2 },
  filterScroll: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EEE", alignItems: "center", justifyContent: "center", marginRight: 8 },
  filterChipActive: { backgroundColor: "#8E44AD", borderColor: "#8E44AD" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
  urgencyBar: { flexDirection: "row", gap: 8 },
  urgencyChip: { flex: 1, height: 32, borderRadius: 10, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEE" },
  urgencyChip_planned: { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" },
  urgencyChip_urgent: { backgroundColor: "#FFF3E0", borderColor: "#FFE0B2" },
  urgencyChip_critical: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  urgencyChipText: { fontSize: 9, fontWeight: "900", color: "#999" },
  textWhite: { color: "#FFF" },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyWrap: { alignItems: "center", marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#444", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#999", textAlign: "center", marginTop: 6 },
  fab: { position: "absolute", bottom: 30, right: 30, borderRadius: 28, overflow: "hidden", elevation: 10, shadowColor: "#8E44AD", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  fabGradient: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },

  // Section B - Preference
  preferenceScroll: { padding: 24, paddingBottom: 100 },
  prefHero: { alignItems: "center", marginBottom: 32 },
  heroCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroTitle: { fontSize: 26, fontWeight: "900", color: "#1A1A1A" },
  heroSub: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginTop: 8 },
  prefCard: { backgroundColor: "#FFF", borderRadius: 28, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  toggleSub: { fontSize: 12, color: "#888", marginTop: 2 },
  toggleBase: { width: 56, height: 30, borderRadius: 15, backgroundColor: "#EEE", padding: 2 },
  toggleActive: { backgroundColor: "#8E44AD" },
  toggleThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFF" },
  toggleThumbActive: { alignSelf: "flex-end" },
  organSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  organHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  organTitle: { fontSize: 15, fontWeight: "700", color: "#444" },
  selectAllLink: { fontSize: 12, color: "#8E44AD", fontWeight: "800" },
  organGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  organChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#EEE" },
  organChipActive: { backgroundColor: "#F3E8FF", borderColor: "#D8B4FE" },
  organChipText: { fontSize: 13, fontWeight: "700", color: "#666" },
  textOrgan: { color: "#8E44AD" },
  legalBox: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, backgroundColor: "#F9F9F9", padding: 16, borderRadius: 16 },
  legalText: { flex: 1, fontSize: 12, color: "#999", lineHeight: 18 },
  historyBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 },
  historyText: { fontSize: 12, color: "#27AE60", fontWeight: "800" },
  saveBtn: { height: 60, borderRadius: 20, backgroundColor: "#8E44AD", alignItems: "center", justifyContent: "center", marginTop: 32, shadowColor: "#8E44AD", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  btnDisabled: { opacity: 0.7 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 36, borderTopRightRadius: 36, height: "90%", padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1A1A1A" },
  modalScroll: { paddingBottom: 60 },
  modalSection: { marginBottom: 20 },
  modalLabel: { fontSize: 10, fontWeight: "900", color: "#999", letterSpacing: 1, marginBottom: 8 },
  modalInput: { height: 50, backgroundColor: "#F8F9FA", borderRadius: 14, paddingHorizontal: 16, fontSize: 16, color: "#1A1A1A", borderWidth: 1, borderColor: "#EEE" },
  modalArea: { height: 80, paddingTop: 12, textAlignVertical: "top" },
  modalRow: { flexDirection: "row" },
  pillRow: { flexDirection: "row", gap: 8 },
  smallPill: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEE" },
  smallPillActive: { backgroundColor: "#8E44AD", borderColor: "#8E44AD" },
  smallPillText: { fontSize: 13, fontWeight: "800", color: "#666" },
  pillScroll: { paddingBottom: 10 },
  organPill: { paddingHorizontal: 16, height: 44, borderRadius: 14, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEE", marginRight: 8 },
  organPillActive: { backgroundColor: "#8E44AD", borderColor: "#8E44AD" },
  organPillText: { fontSize: 14, fontWeight: "800", color: "#666" },
  urgencyPills: { flexDirection: "row", gap: 8 },
  uPill: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEE" },
  uPill_planned: { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" },
  uPill_urgent: { backgroundColor: "#FFF3E0", borderColor: "#FFE0B2" },
  uPill_critical: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  uPillText: { fontSize: 10, fontWeight: "900", color: "#999" },
  submitBtn: { height: 64, borderRadius: 24, backgroundColor: "#8E44AD", alignItems: "center", justifyContent: "center", marginTop: 24 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
});
