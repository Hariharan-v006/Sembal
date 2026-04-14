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
} from "react-native";
import { ORGANS } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function OrganDonationScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("organ_donation_consents")
      .select("*")
      .eq("user_id", profile.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEnabled(Boolean(data.is_donor));
          setSelected(data.organs ?? []);
          setConsentDate(data.consent_date ?? null);
        }
        setIsInitializing(false);
      });
  }, [profile?.id]);

  const save = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const nextConsentDate = enabled ? new Date().toISOString().slice(0, 10) : null;
    const { error } = await supabase.from("organ_donation_consents").upsert({
      user_id: profile.id,
      is_donor: enabled,
      organs: enabled ? selected : [],
      consent_date: nextConsentDate,
    });
    
    setLoading(false);
    if (error) return Alert.alert("Error", error.message);
    
    setConsentDate(nextConsentDate);
    Alert.alert("Hero Status Updated", "Your organ donation preferences have been securely saved.", [
      { text: "Return", onPress: () => router.back() }
    ]);
  };

  const toggleAll = () => {
    if (selected.length === ORGANS.length) {
      setSelected([]);
    } else {
      setSelected([...ORGANS]);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C0392B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#2C0B0B", "#4A0000"]}
        style={styles.heroHeader}
      >
        <SafeAreaView>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
              <Text style={styles.badgeText}>Verified Choice</Text>
            </View>
          </View>
          
          <View style={styles.heroContent}>
            <Ionicons name="heart" size={48} color="#E74C3C" />
            <Text style={styles.heroTitle}>Organ Donation</Text>
            <Text style={styles.heroSubtitle}>Be a life-giver beyond life. Your intent can save up to 8 lives.</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Toggle Card */}
        <View style={styles.card}>
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefTitle}>Donor Preference</Text>
              <Text style={styles.prefSub}>Express your intent to donate</Text>
            </View>
            <Pressable 
              onPress={() => setEnabled(!enabled)}
              style={[styles.toggleBase, enabled && styles.toggleActive]}
            >
              <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
            </Pressable>
          </View>

          {enabled && (
            <View style={styles.selectionArea}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Select Organs / Tissues</Text>
                <Pressable onPress={toggleAll}>
                  <Text style={styles.toggleAllText}>
                    {selected.length === ORGANS.length ? "Deselect All" : "Select All"}
                  </Text>
                </Pressable>
              </View>
              
              <View style={styles.grid}>
                {ORGANS.map((organ) => {
                  const isActive = selected.includes(organ);
                  return (
                    <Pressable
                      key={organ}
                      onPress={() => setSelected(prev => 
                        isActive ? prev.filter(o => o !== organ) : [...prev, organ]
                      )}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{organ}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#888" />
          <Text style={styles.infoText}>
            This preference indicates your legal intent. We recommend informing your family about your decision.
          </Text>
        </View>

        {consentDate && (
          <View style={styles.consentBadge}>
            <Ionicons name="calendar-outline" size={16} color="#27AE60" />
            <Text style={styles.consentText}>Last registered on {consentDate}</Text>
          </View>
        )}

        <Pressable 
          disabled={loading} 
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
          onPress={save}
        >
          <Text style={styles.saveBtnText}>{loading ? "Saving..." : "Save My Preference"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroHeader: {
    paddingBottom: 40,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTop: {
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroContent: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 30,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prefInfo: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  prefSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  toggleBase: {
    width: 60,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F0F0",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#C0392B",
  },
  toggleThumb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  selectionArea: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 24,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
  },
  toggleAllText: {
    fontSize: 12,
    color: "#C0392B",
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  chipActive: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  chipTextActive: {
    color: "#C0392B",
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
  consentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  consentText: {
    fontSize: 12,
    color: "#27AE60",
    fontWeight: "700",
  },
  saveBtn: {
    height: 60,
    borderRadius: 20,
    backgroundColor: "#C0392B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
