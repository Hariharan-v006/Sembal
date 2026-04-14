import {
  Alert,
  Pressable,
  Text,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export default function ProfileScreen() {
  const { profile, updateProfile, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [donationCount, setDonationCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      supabase.from("blood_requests").select("id", { count: "exact", head: true }).eq("requester_id", profile.id),
      supabase.from("donation_records").select("id", { count: "exact", head: true }).eq("donor_id", profile.id),
    ]).then(([{ count: req }, { count: don }]) => {
      setRequestCount(req ?? 0);
      setDonationCount(don ?? 0);
    });
  }, [profile?.id]);

  const toggleAvailable = async () => {
    if (!profile) return;
    const next = !profile.is_available;
    setUpdatingAvailability(true);
    updateProfile({ is_available: next });
    const { error } = await supabase.from("profiles").update({ is_available: next }).eq("id", profile.id);
    setUpdatingAvailability(false);
    if (error) {
      updateProfile({ is_available: !next });
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#4A0000", "#8B1A1A"]}
        style={styles.headerBackground}
      />
      
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person" size={40} color="#AAA" />
              </View>
              <View style={styles.bloodTag}>
                <Text style={styles.bloodTagText}>{profile?.blood_group ?? "?"}</Text>
              </View>
            </View>
            
            <View style={styles.nameSection}>
              <Text style={styles.userName}>{profile?.full_name ?? "User"}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color="#C0392B" />
                <Text style={styles.locationText}>{profile?.city ?? "Set location"} • India</Text>
              </View>
            </View>

            {/* Availability Toggle */}
            <Pressable 
              disabled={updatingAvailability} 
              onPress={toggleAvailable}
              style={[
                styles.availabilityBtn,
                profile?.is_available ? styles.btnAvailable : styles.btnUnavailable
              ]}
            >
              {updatingAvailability ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <View style={[styles.dot, { backgroundColor: profile?.is_available ? "#4CAF50" : "#FFC107" }]} />
                  <Text style={styles.btnText}>
                    {profile?.is_available ? "Available to Donate" : "Currently Unavailable"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="white" />
                </>
              )}
            </Pressable>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{donationCount}</Text>
              <Text style={styles.statLbl}>Donations</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{requestCount}</Text>
              <Text style={styles.statLbl}>Requests</Text>
            </View>
          </View>

          {/* Actions Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account & Health</Text>
          </View>
          
          <Pressable style={styles.actionItem} onPress={() => router.push("/eligibility")}>
            <View style={[styles.iconWrap, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Eligibility Checker</Text>
              <Text style={styles.actionSub}>Check if you can donate now</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </Pressable>

          <Pressable style={styles.actionItem} onPress={() => router.push("/my-requests")}>
            <View style={[styles.iconWrap, { backgroundColor: "#FDF2F2" }]}>
              <Ionicons name="journal" size={20} color="#C0392B" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Requests</Text>
              <Text style={styles.actionSub}>Track and manage your appeals</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </Pressable>

          {/* Sign Out */}
          <Pressable 
            style={styles.signOutBtn} 
            onPress={() => Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: async () => await logout() },
            ])}
          >
            <Ionicons name="log-out-outline" size={20} color="#C0392B" />
            <Text style={styles.signOutText}>Sign Out of My Account</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  flex: { flex: 1 },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bloodTag: {
    backgroundColor: "#C0392B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bloodTagText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 20,
  },
  nameSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  userName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  availabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  btnAvailable: {
    backgroundColor: "#C0392B",
  },
  btnUnavailable: {
    backgroundColor: "#2C3E50",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  btnText: {
    flex: 1,
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  statVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#C0392B",
  },
  statLbl: {
    fontSize: 10,
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actionItem: {
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
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  actionSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 40,
    gap: 10,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#C0392B",
  },
});
