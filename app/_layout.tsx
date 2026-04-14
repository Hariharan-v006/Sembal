import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setSession, setUser, setProfile, session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  // Initialize notifications gracefully (wrapped in try-catch internally)
  useNotifications();

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single();
        setProfile(profile);
      }
      setLoading(false);
    };
    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", nextSession.user.id)
          .single();
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [setProfile, setSession, setUser]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/login");
    if (session && inAuth) router.replace("/(tabs)");
  }, [loading, router, segments, session]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#4A0000", "#C0392B", "#E74C3C"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingCenter}>
          <View style={styles.indicatorWrap}>
            <ActivityIndicator size="large" color="white" />
          </View>
          <Text style={styles.logoText}>SEMBAL</Text>
          <Text style={styles.sloganText}>Blood Response Network</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCenter: {
    alignItems: "center",
  },
  indicatorWrap: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  sloganText: {
    marginTop: 8,
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
