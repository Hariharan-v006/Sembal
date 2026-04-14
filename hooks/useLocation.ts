import { useEffect, useState, useCallback } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function useLocation() {
  const profile = useAuthStore((s) => s.profile);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(async () => {
    // Only fetch if profile exists to avoid unnecessary prompts for guests/logged-out
    if (!profile?.id) return null;
    
    setLoading(true);
    try {
      // 1. Request Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission denied");
        setLoading(false);
        return null;
      }

      // 2. Check and Prompt for GPS Hardware (Android)
      if (Platform.OS === "android") {
        const providerStatus = await Location.getProviderStatusAsync();
        if (!providerStatus.locationServicesEnabled) {
          try {
            await Location.enableNetworkProviderAsync();
          } catch (e) {
            setError("GPS is disabled");
            setLoading(false);
            return null;
          }
        }
      }

      // 3. Get Location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(newCoords);
      setError(null);
      setLoading(false);

      // 4. Save to Database Profile
      // This ensures we always have the latest donor location on the server
      await supabase
        .from("profiles")
        .update({
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
        })
        .eq("id", profile.id);

      return newCoords;
    } catch (err) {
      setError("Unable to fetch location");
      setLoading(false);
      return null;
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      getLocation();
    }
  }, [getLocation, profile?.id]);

  return { coords, error, loading, getLocation };
}
