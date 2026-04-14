import { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

type AssessmentResult = {
  status: "eligible" | "temporary" | "critical";
  reasons: string[];
};

type FormState = {
  age: string;
  weight: string;
  chronicDiseases: boolean;
  lowHb: boolean;
  fever: boolean;
  antibiotics: boolean;
  recentDonation: boolean;
  recentSurgery: boolean;
  recentTattoo: boolean;
  alcohol: boolean;
  pregnant: boolean;
};

export default function EligibilityScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    age: "",
    weight: "",
    chronicDiseases: false,
    lowHb: false,
    fever: false,
    antibiotics: false,
    recentDonation: false,
    recentSurgery: false,
    recentTattoo: false,
    alcohol: false,
    pregnant: false,
  });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateResult = (): AssessmentResult => {
    const reasons: string[] = [];
    const ageNum = parseInt(form.age) || 0;
    const weightNum = parseInt(form.weight) || 0;

    // ❌ CRITICAL (NOT ELIGIBLE)
    if (ageNum < 18) reasons.push("Under 18 years of age");
    if (weightNum < 50) reasons.push("Weight under 50 kg");
    if (form.chronicDiseases) reasons.push("Chronic medical conditions");
    if (form.lowHb) reasons.push("Low hemoglobin / Anemia");
    if (form.pregnant) reasons.push("Pregnancy / Recent delivery");

    if (reasons.length > 0) return { status: "critical", reasons };

    // ⚠️ TEMPORARY
    if (ageNum > 60) reasons.push("Over 60 years (Doctor consultation recommended)");
    if (form.fever) reasons.push("Current fever or infection");
    if (form.antibiotics) reasons.push("Currently taking antibiotics/medication");
    if (form.recentDonation) reasons.push("Donated in the last 3 months");
    if (form.recentSurgery) reasons.push("Surgery in the last 6 months");
    if (form.recentTattoo) reasons.push("Tattoo/Piercing in the last 6 months");
    if (form.alcohol) reasons.push("Alcohol consumption in the last 24 hours");

    if (reasons.length > 0) return { status: "temporary", reasons };

    // ✅ ELIGIBLE
    return { status: "eligible", reasons: ["You meet all standard criteria for donation!"] };
  };

  const finishAssessment = async () => {
    if (!profile?.id) return;
    setIsSubmitting(true);
    const assessment = calculateResult();
    
    const { error: insertError } = await supabase.from("eligibility_checks").insert({
      user_id: profile.id,
      status: assessment.status === "critical" ? "not_eligible" : assessment.status,
      reason: assessment.reasons.join(", "),
      answers: form,
    });

    if (insertError) {
      setIsSubmitting(false);
      return Alert.alert("Error", "Could not save results.");
    }

    await supabase.rpc("refresh_eligibility_status");
    const { data: updatedProfile } = await supabase.from("profiles").select("eligibility_status").eq("id", profile.id).single();
    if (updatedProfile?.eligibility_status) {
      updateProfile({ eligibility_status: updatedProfile.eligibility_status });
    }

    setIsSubmitting(false);
    setResult(assessment);
  };

  const sections = [
    { title: "Basic Criteria", steps: [1, 2] },
    { title: "Medical History", steps: [3, 4] },
    { title: "Current Health", steps: [5, 6] },
    { title: "Recent History", steps: [7, 8, 9] },
    { title: "Lifestyle", steps: [10] },
    { title: "Special Cases", steps: [11] },
  ];

  const currentSection = sections.find((s) => s.steps.includes(step))?.title ?? "";

  const renderOption = (value: boolean, onSelect: (val: boolean) => void) => (
    <View style={styles.optionRow}>
      <Pressable 
        onPress={() => onSelect(true)} 
        style={[styles.optionCard, value && styles.optionCardActiveYes]}
      >
        <Ionicons name="checkmark-circle" size={20} color={value ? "#FFF" : "#DDD"} />
        <Text style={[styles.optionLabel, value && styles.textWhite]}>YES</Text>
      </Pressable>
      <Pressable 
        onPress={() => onSelect(false)} 
        style={[styles.optionCard, !value && styles.optionCardActiveNo]}
      >
        <Ionicons name="close-circle" size={20} color={!value ? "#FFF" : "#DDD"} />
        <Text style={[styles.optionLabel, !value && styles.textWhite]}>NO</Text>
      </Pressable>
    </View>
  );

  if (result) {
    const isSuccess = result.status === "eligible";
    const isWarning = result.status === "temporary";
    
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <ScrollView contentContainerStyle={styles.resultContent}>
            <View style={[styles.resultHeader, isSuccess ? styles.bgGreen : isWarning ? styles.bgOrange : styles.bgRed]}>
              <Ionicons 
                name={isSuccess ? "heart" : isWarning ? "time" : "hand-left"} 
                size={80} 
                color="#FFF" 
              />
              <Text style={styles.resultStatusText}>
                {isSuccess ? "ELIGIBLE" : isWarning ? "TEMPORARY ALERT" : "NOT ELIGIBLE"}
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                {isSuccess ? "Ready to Save Lives!" : "Please Take Note"}
              </Text>
              <Text style={styles.resultSub}>
                {isSuccess 
                  ? "You have passed the preliminary screening. Visit any donor center to proceed." 
                  : "Based on your answers, here is what we found:"}
              </Text>

              <View style={styles.reasonList}>
                {result.reasons.map((r, i) => (
                  <View key={i} style={styles.reasonItem}>
                    <Ionicons name={isSuccess ? "checkmark" : "alert-circle"} size={16} color={isSuccess ? "#27AE60" : "#E67E22"} />
                    <Text style={styles.reasonText}>{r}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.finishBtn} onPress={() => router.replace("/(tabs)")}>
                <Text style={styles.finishBtnText}>Go to Dashboard</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
            <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Blood Eligibility</Text>
            <Text style={styles.headerSubtitle}>{currentSection}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 11) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {step} of 11</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <View style={styles.questionCard}>
            {step === 1 && (
              <View style={styles.step}>
                <Text style={styles.label}>How old are you?</Text>
                <TextInput style={styles.input} value={form.age} onChangeText={(v) => setForm({...form, age: v})} keyboardType="numeric" placeholder="Enter age" autoFocus />
              </View>
            )}
            {step === 2 && (
              <View style={styles.step}>
                <Text style={styles.label}>What is your current weight?</Text>
                <View style={styles.inputWrap}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={form.weight} onChangeText={(v) => setForm({...form, weight: v})} keyboardType="numeric" placeholder="Weight" autoFocus />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
              </View>
            )}
            {step === 3 && (
              <View style={styles.step}>
                <Text style={styles.label}>Do you have chronic conditions?</Text>
                <Text style={styles.subtext}>Heart disease, Diabetes, or Severe Hypertension.</Text>
                {renderOption(form.chronicDiseases, (v) => setForm({...form, chronicDiseases: v}))}
              </View>
            )}
            {step === 4 && (
              <View style={styles.step}>
                <Text style={styles.label}>Do you have low hemoglobin?</Text>
                <Text style={styles.subtext}>Known anemia or low iron levels.</Text>
                {renderOption(form.lowHb, (v) => setForm({...form, lowHb: v}))}
              </View>
            )}
            {step === 5 && (
              <View style={styles.step}>
                <Text style={styles.label}>Do you currently have fever?</Text>
                <Text style={styles.subtext}>Or any active infection/illness.</Text>
                {renderOption(form.fever, (v) => setForm({...form, fever: v}))}
              </View>
            )}
            {step === 6 && (
              <View style={styles.step}>
                <Text style={styles.label}>Are you taking antibiotics?</Text>
                <Text style={styles.subtext}>Or any strong prescribed medication.</Text>
                {renderOption(form.antibiotics, (v) => setForm({...form, antibiotics: v}))}
              </View>
            )}
            {step === 7 && (
              <View style={styles.step}>
                <Text style={styles.label}>Donated in last 3 months?</Text>
                {renderOption(form.recentDonation, (v) => setForm({...form, recentDonation: v}))}
              </View>
            )}
            {step === 8 && (
              <View style={styles.step}>
                <Text style={styles.label}>Recent surgery?</Text>
                <Text style={styles.subtext}>Any major procedure in the last 6 months.</Text>
                {renderOption(form.recentSurgery, (v) => setForm({...form, recentSurgery: v}))}
              </View>
            )}
            {step === 9 && (
              <View style={styles.step}>
                <Text style={styles.label}>New Tattoo or Piercing?</Text>
                <Text style={styles.subtext}>In the last 6 months.</Text>
                {renderOption(form.recentTattoo, (v) => setForm({...form, recentTattoo: v}))}
              </View>
            )}
            {step === 10 && (
              <View style={styles.step}>
                <Text style={styles.label}>Alcohol in last 24 hours?</Text>
                {renderOption(form.alcohol, (v) => setForm({...form, alcohol: v}))}
              </View>
            )}
            {step === 11 && (
              <View style={styles.step}>
                <Text style={styles.label}>Are you pregnant?</Text>
                <Text style={styles.subtext}>Includes post-delivery recovery phase.</Text>
                {renderOption(form.pregnant, (v) => setForm({...form, pregnant: v}))}
              </View>
            )}
          </View>

          <View style={styles.nav}>
            {step > 1 && (
              <Pressable style={styles.btnSecondary} onPress={() => setStep(s => s - 1)}>
                <Text style={styles.btnTextSec}>Back</Text>
              </Pressable>
            )}
            {step < 11 ? (
              <Pressable style={styles.btnPrimary} onPress={() => setStep(s => s + 1)}>
                <Text style={styles.btnTextPri}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </Pressable>
            ) : (
              <Pressable style={styles.btnPrimary} onPress={finishAssessment} disabled={isSubmitting}>
                <Text style={styles.btnTextPri}>{isSubmitting ? "Evaluating..." : "View Result"}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFD" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
  headerSubtitle: { fontSize: 11, color: "#C0392B", fontWeight: "700", textTransform: "uppercase" },
  progressContainer: { paddingHorizontal: 24, marginTop: 10 },
  progressBarBg: { height: 4, backgroundColor: "#F0F0F0", borderRadius: 2 },
  progressBarFill: { height: "100%", backgroundColor: "#C0392B", borderRadius: 2 },
  progressText: { fontSize: 10, color: "#999", fontWeight: "700", marginTop: 6, textAlign: "right" },
  formContent: { padding: 24 },
  questionCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    minHeight: 280,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  step: { width: "100%" },
  label: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 8 },
  subtext: { fontSize: 13, color: "#777", textAlign: "center", marginBottom: 24, lineHeight: 18 },
  input: {
    height: 56,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  inputUnit: { fontSize: 16, fontWeight: "800", color: "#888" },
  optionRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  optionCard: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  optionCardActiveYes: { backgroundColor: "#27AE60", borderColor: "#27AE60" },
  optionCardActiveNo: { backgroundColor: "#C0392B", borderColor: "#C0392B" },
  optionLabel: { fontSize: 16, fontWeight: "900", color: "#666" },
  textWhite: { color: "#FFF" },
  nav: { flexDirection: "row", gap: 12, marginTop: 24 },
  btnPrimary: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1A1B1E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextPri: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  btnTextSec: { color: "#666", fontSize: 16, fontWeight: "700" },
  resultContent: { padding: 0 },
  resultHeader: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  bgGreen: { backgroundColor: "#27AE60" },
  bgOrange: { backgroundColor: "#E67E22" },
  bgRed: { backgroundColor: "#C0392B" },
  resultStatusText: { color: "#FFF", fontSize: 28, fontWeight: "900", marginTop: 16 },
  resultCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    padding: 30,
    minHeight: 500,
  },
  resultTitle: { fontSize: 24, fontWeight: "900", color: "#1A1A1A", textAlign: "center" },
  resultSub: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, lineHeight: 22 },
  reasonList: { marginTop: 30, backgroundColor: "#F8F9FA", borderRadius: 20, padding: 20 },
  reasonItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  reasonText: { fontSize: 14, color: "#444", fontWeight: "600", flex: 1 },
  finishBtn: {
    height: 60,
    borderRadius: 20,
    backgroundColor: "#1A1B1E",
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
