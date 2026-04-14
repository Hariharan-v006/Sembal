import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useLocation } from "@/hooks/useLocation";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { BLOOD_GROUPS } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function SosScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { coords, getLocation } = useLocation();
  const [hospital, setHospital] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(profile?.blood_group || "O+");
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    if (profile?.blood_group) {
      setSelectedBloodGroup(profile.blood_group);
    }
  }, [profile?.blood_group]);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("sos_alerts")
      .select("created_at")
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data?.created_at) return;
        setCooldownUntil(new Date(new Date(data.created_at).getTime() + 60 * 60 * 1000));
      });
  }, [profile?.id]);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownUntil) return 0;
    const diff = cooldownUntil.getTime() - nowTick;
    return Math.max(0, Math.floor(diff / 1000));
  }, [cooldownUntil, nowTick]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const trigger = async () => {
    if (!profile?.id) return;
    if (!hospital) {
      return Alert.alert("Required", "Please enter the hospital name.");
    }
    
    setIsTriggering(true);
    let currentCoords = coords;
    if (!currentCoords) {
      currentCoords = await getLocation();
    }

    if (!currentCoords) {
      setIsTriggering(false);
      return Alert.alert("Location Required", "Unable to get your GPS location for the emergency alert.");
    }

    const { data, error } = await supabase
      .from("sos_alerts")
      .insert({
        requester_id: profile.id,
        blood_group: selectedBloodGroup,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        hospital_name: hospital,
        contact_number: profile.phone ?? "",
        radius_km: 30,
      })
      .select("created_at, donors_notified")
      .single();

    if (error) {
      setIsTriggering(false);
      return Alert.alert("Error", error.message);
    }
    
    try {
      await invokeEdgeFunction("notify-sos-nearby", {
        blood_group: selectedBloodGroup,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        hospital_name: hospital,
        request_id: profile.id, // Using profile.id as a fallback or the actual alert id if needed
      });
    } catch (edgeError) {
      console.error("SOS Notify edge function failed:", edgeError);
    }
    
    setSentCount(data?.donors_notified ?? 0);
    setCooldownUntil(new Date(new Date(data.created_at).getTime() + 60 * 60 * 1000));
    setIsTriggering(false);
    Alert.alert("SOS Triggered", `Emergency alert broadcasted to nearby donors.`);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#2C0B0B", "#4A0000", "#1A0A0A"]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.iconHeader}>
                <Ionicons name="warning" size={32} color="#E74C3C" />
              </View>
              <Text style={styles.title}>Emergency SOS</Text>
              <Text style={styles.subtitle}>
                Broadcast an urgent blood need to all active donors within 30km.
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>HOSPITAL / LOCATION</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="business" size={20} color="#E74C3C" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. City General Hospital"
                    placeholderTextColor="#666"
                    value={hospital}
                    onChangeText={setHospital}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>BLOOD GROUP NEEDED</Text>
                <View style={styles.bloodGrid}>
                  {BLOOD_GROUPS.map((g) => (
                    <Pressable
                      key={g}
                      style={[
                        styles.bloodChip,
                        selectedBloodGroup === g && styles.bloodChipActive
                      ]}
                      onPress={() => setSelectedBloodGroup(g)}
                    >
                      <Text style={[
                        styles.bloodText,
                        selectedBloodGroup === g && styles.bloodTextActive
                      ]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.buttonSection}>
              <View style={styles.sphereContainer}>
                <Pressable
                  onPress={trigger}
                  disabled={cooldownRemaining > 0 || isTriggering}
                  style={({ pressed }) => [
                    styles.sosSphere,
                    pressed && styles.sosPressed,
                    (cooldownRemaining > 0 || isTriggering) && styles.sosDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={cooldownRemaining > 0 ? ["#444", "#222"] : ["#FF4D4D", "#C0392B"]}
                    style={styles.sphereGradient}
                  >
                    <Text style={styles.sosLabel}>
                      {isTriggering ? "..." : "SOS"}
                    </Text>
                    {cooldownRemaining > 0 && (
                      <View style={styles.timerWrap}>
                        <Text style={styles.timerText}>
                          {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, "0")}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
                
                {/* Visual depth rings */}
                <View style={[styles.ring, styles.ringOuter]} />
                <View style={[styles.ring, styles.ringMid]} />
              </View>
              
              <Text style={styles.warningHint}>
                {cooldownRemaining > 0 
                  ? "Broadcast on cooldown" 
                  : "Tap to trigger instant broadcast"}
              </Text>

              {typeof sentCount === "number" && (
                <View style={styles.successFlash}>
                  <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                  <Text style={styles.successText}>{sentCount} donors notified</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A0A0A" },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 60 },
  header: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 30,
  },
  iconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.3)",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  formCard: {
    margin: 20,
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E74C3C",
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 54,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  textInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bloodChip: {
    width: (width - 108) / 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  bloodChipActive: {
    backgroundColor: "#E74C3C",
    borderColor: "#FF4D4D",
  },
  bloodText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#AAA",
  },
  bloodTextActive: {
    color: "#FFF",
  },
  buttonSection: {
    alignItems: "center",
    marginTop: 10,
  },
  sphereContainer: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  sosSphere: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: "hidden",
    zIndex: 10,
    elevation: 12,
    shadowColor: "#E74C3C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  sphereGradient: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  sosLabel: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  sosPressed: {
    transform: [{ scale: 0.9 }],
  },
  sosDisabled: {
    opacity: 0.8,
  },
  timerWrap: {
    marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.2)",
  },
  ringOuter: {
    width: 240,
    height: 240,
    borderColor: "rgba(231, 76, 60, 0.05)",
  },
  ringMid: {
    width: 210,
    height: 210,
    borderColor: "rgba(231, 76, 60, 0.1)",
  },
  warningHint: {
    marginTop: 20,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  successFlash: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 204, 113, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.2)",
    gap: 8,
  },
  successText: {
    color: "#2ECC71",
    fontSize: 13,
    fontWeight: "800",
  },
});
