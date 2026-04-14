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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useLocation } from "@/hooks/useLocation";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

export default function SosScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { coords } = useLocation();
  const [hospital, setHospital] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

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
    if (!profile?.id || !coords) return;
    if (!hospital) {
      return Alert.alert("Required", "Please enter the hospital name where blood is needed.");
    }
    
    const { data, error } = await supabase
      .from("sos_alerts")
      .insert({
        requester_id: profile.id,
        blood_group: profile.blood_group,
        latitude: coords.latitude,
        longitude: coords.longitude,
        hospital_name: hospital,
        contact_number: profile.phone ?? "",
        radius_km: 30,
      })
      .select("created_at, donors_notified")
      .single();

    if (error) return Alert.alert("Error", error.message);
    
    try {
      await invokeEdgeFunction("notify-sos-nearby", {
        blood_group: profile.blood_group,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (edgeError) {
      console.error("SOS Notify edge function failed:", edgeError);
    }
    
    setSentCount(data?.donors_notified ?? 0);
    setCooldownUntil(new Date(new Date(data.created_at).getTime() + 60 * 60 * 1000));
    Alert.alert("SOS Triggered", `Alert broadcasted to nearby donors.`);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#2C0B0B", "#4A0000", "#1A0A0A"]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Background Decorative Rings */}
      <View style={styles.ring1} />
      <View style={styles.ring2} />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <View style={styles.content}>
            <View style={styles.iconHeader}>
              <Ionicons name="warning" size={40} color="#E74C3C" />
            </View>
            <Text style={styles.title}>Emergency SOS</Text>
            <Text style={styles.subtitle}>
              Broadcast an urgent blood need to all active donors within 30km.
            </Text>

            <View style={styles.inputCard}>
              <Text style={styles.label}>HOSPITAL / LOCATION</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="business" size={20} color="#888" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. City General Hospital"
                  placeholderTextColor="#666"
                  value={hospital}
                  onChangeText={setHospital}
                  autoFocus={false}
                />
              </View>
            </View>

            <View style={styles.buttonSection}>
              <Pressable
                onPress={trigger}
                disabled={cooldownRemaining > 0}
                style={({ pressed }) => [
                  styles.sosButtonOuter,
                  pressed && styles.sosPressed,
                  cooldownRemaining > 0 && styles.sosDisabled,
                ]}
              >
                <LinearGradient
                  colors={cooldownRemaining > 0 ? ["#444", "#222"] : ["#E74C3C", "#C0392B"]}
                  style={styles.sosButtonInner}
                >
                  <Text style={styles.sosLabel}>SOS</Text>
                  {cooldownRemaining > 0 && (
                    <View style={styles.timerWrap}>
                      <Ionicons name="time-outline" size={14} color="#FFAAAA" />
                      <Text style={styles.timerText}>
                        {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, "0")}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
              
              <Text style={styles.warningHint}>
                {cooldownRemaining > 0 
                  ? "Broadcast on cooldown" 
                  : "Tap and hold to trigger emergency alert"}
              </Text>
            </View>

            {typeof sentCount === "number" && (
              <View style={styles.successFlash}>
                <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                <Text style={styles.successText}>{sentCount} donors notified in your area</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A0A0A",
  },
  flex: { flex: 1 },
  ring1: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.05)",
    top: "30%",
    left: -100,
  },
  ring2: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: 300,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.03)",
    top: "10%",
    right: -200,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  iconHeader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.2)",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  inputCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 20,
    marginTop: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSection: {
    marginTop: 50,
    alignItems: "center",
  },
  sosButtonOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    padding: 10,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.2)",
  },
  sosButtonInner: {
    flex: 1,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E74C3C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  sosLabel: {
    fontSize: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  sosPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  sosDisabled: {
    opacity: 0.6,
  },
  timerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  timerText: {
    color: "#FFAAAA",
    fontSize: 14,
    fontWeight: "700",
  },
  warningHint: {
    marginTop: 20,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
  successFlash: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 204, 113, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.2)",
    gap: 10,
  },
  successText: {
    color: "#2ECC71",
    fontSize: 13,
    fontWeight: "700",
  },
});
