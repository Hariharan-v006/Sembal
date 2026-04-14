import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BLOOD_GROUPS } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useLocation } from "@/hooks/useLocation";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

const schema = z.object({
  patient_name: z.string().min(2, "Patient name is required"),
  hospital_name: z.string().min(2, "Hospital name is required"),
  hospital_address: z.string().min(4, "Hospital address is required"),
  contact_number: z.string().min(8, "Contact number is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateRequestScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { coords, getLocation } = useLocation();
  const [bloodGroup, setBloodGroup] = useState<(typeof BLOOD_GROUPS)[number]>("O+");
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "critical">("normal");
  const [expiresIn, setExpiresIn] = useState<"12" | "24" | "48" | "none">("24");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact_number: profile?.phone ?? "",
      patient_name: "",
      hospital_name: "",
      hospital_address: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!profile?.id) return;

    let currentCoords = coords;
    if (!currentCoords) {
      currentCoords = await getLocation();
    }

    if (!currentCoords) {
      Alert.alert("Location Required", "Please enable your GPS to post a request so nearby donors can find you.");
      return;
    }

    const expires_at =
      expiresIn === "none" ? null : new Date(Date.now() + Number(expiresIn) * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("blood_requests").insert({
      requester_id: profile.id,
      patient_name: values.patient_name,
      blood_group: bloodGroup,
      units_needed: units,
      urgency,
      hospital_name: values.hospital_name,
      hospital_address: values.hospital_address,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      contact_number: values.contact_number,
      notes: values.notes || null,
      status: "open",
      is_sos: false, // Normal request
      expires_at,
    });

    if (error) return Alert.alert("Request Failed", error.message);
    
    Alert.alert("Request Posted", "Donors in your area have been notified.", [
      { text: "Dashboard", onPress: () => router.replace("/(tabs)") }
    ]);
  };

  const InputField = ({ 
    label, 
    name, 
    icon, 
    placeholder, 
    multiline = false, 
    keyboardType = "default" 
  }: { 
    label: string; 
    name: keyof FormValues; 
    icon: keyof typeof Ionicons.glyphMap; 
    placeholder: string; 
    multiline?: boolean; 
    keyboardType?: any; 
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, multiline && styles.inputMultiline]}>
        <Ionicons name={icon} size={20} color="#C0392B" style={styles.inputIcon} />
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange } }) => (
            <TextInput
              style={[styles.textInput, multiline && styles.textInputMultiline]}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor="#999"
              multiline={multiline}
              keyboardType={keyboardType}
            />
          )}
        />
      </View>
      {errors[name] && <Text style={styles.errorText}>{(errors[name] as any).message}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#4A0000", "#C0392B"]} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>New Request</Text>
              <Text style={styles.headerSubtitle}>Broadcast to neighbors</Text>
            </View>
            <View style={{ width: 44 }} /> 
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Patient Section */}
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <InputField label="Patient Full Name" name="patient_name" icon="person-outline" placeholder="Enter name" />
          
          <Text style={styles.inputLabel}>Blood Group Required</Text>
          <View style={styles.groupGrid}>
            {BLOOD_GROUPS.map((g) => (
              <Pressable
                key={g}
                style={[styles.groupChip, bloodGroup === g && styles.groupChipActive]}
                onPress={() => setBloodGroup(g)}
              >
                <Text style={[styles.groupChipText, bloodGroup === g && styles.textWhite]}>{g}</Text>
              </Pressable>
            ))}
          </View>

          {/* Logistics Section */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Logistics & Urgency</Text>
          <InputField label="Hospital Name" name="hospital_name" icon="business-outline" placeholder="e.g. City General" />
          <InputField label="Hospital Address" name="hospital_address" icon="location-outline" placeholder="Full address" multiline />
          <InputField label="Contact Number" name="contact_number" icon="call-outline" placeholder="+91" keyboardType="phone-pad" />

          {/* Units Required */}
          <View style={styles.unitsRow}>
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>Units Needed</Text>
              <Text style={styles.unitsSub}>Bags required</Text>
            </View>
            <View style={styles.counter}>
              <Pressable style={styles.counterBtn} onPress={() => setUnits(u => Math.max(1, u - 1))}>
                <Ionicons name="remove" size={20} color="#666" />
              </Pressable>
              <Text style={styles.counterText}>{units}</Text>
              <Pressable style={styles.counterBtn} onPress={() => setUnits(u => Math.min(10, u + 1))}>
                <Ionicons name="add" size={20} color="#666" />
              </Pressable>
            </View>
          </View>

          {/* Urgency */}
          <Text style={styles.inputLabel}>Urgency Level</Text>
          <View style={styles.urgencyRow}>
            {(["normal", "urgent", "critical"] as const).map((u) => (
              <Pressable
                key={u}
                style={[styles.urgencyBtn, urgency === u && (styles as any)[`urgencyBtn_${u}`]]}
                onPress={() => setUrgency(u)}
              >
                <Text style={[styles.urgencyText, urgency === u && styles.textWhite]}>
                  {u.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <InputField label="Additional Notes (Optional)" name="notes" icon="document-text-outline" placeholder="Instructions for donors" multiline />

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <LinearGradient colors={["#E74C3C", "#C0392B"]} style={styles.submitGradient}>
              <Text style={styles.submitText}>{isSubmitting ? "BROADCASTING..." : "BROADCAST REQUEST"}</Text>
              <Ionicons name="navigate" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  flex: { flex: 1 },
  header: { paddingBottom: 30, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  scrollContent: { padding: 24, paddingBottom: 60 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#1A1A1A", marginBottom: 20, letterSpacing: -0.5 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: "800", color: "#666", marginBottom: 8, textTransform: "uppercase" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE",
    paddingHorizontal: 16,
  },
  inputMultiline: { alignItems: "flex-start", paddingTop: 12 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, height: 54, fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  textInputMultiline: { height: 100, paddingTop: 8, textAlignVertical: "top" },
  errorText: { color: "#C0392B", fontSize: 11, fontWeight: "700", marginTop: 4, marginLeft: 4 },
  groupGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  groupChip: {
    width: (width - 88) / 4,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#EEE",
    alignItems: "center",
    justifyContent: "center",
  },
  groupChipActive: { backgroundColor: "#C0392B", borderColor: "#C0392B" },
  groupChipText: { fontSize: 15, fontWeight: "800", color: "#444" },
  textWhite: { color: "#FFF" },
  unitsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  unitsSub: { fontSize: 11, color: "#999", fontWeight: "600" },
  counter: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FA", borderRadius: 16, padding: 6, gap: 16 },
  counterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEE" },
  counterText: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
  urgencyRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  urgencyBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEE" },
  urgencyBtn_normal: { backgroundColor: "#3498DB", borderColor: "#3498DB" },
  urgencyBtn_urgent: { backgroundColor: "#E67E22", borderColor: "#E67E22" },
  urgencyBtn_critical: { backgroundColor: "#C0392B", borderColor: "#C0392B" },
  urgencyText: { fontSize: 11, fontWeight: "900", color: "#666" },
  submitBtn: { marginTop: 20, borderRadius: 20, overflow: "hidden", elevation: 8, shadowColor: "#C0392B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
});
