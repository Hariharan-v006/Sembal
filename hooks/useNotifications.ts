import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const profile = useAuthStore((s) => s.profile);
  const addNotification = useNotificationStore((s) => s.addNotification);
  useEffect(() => {
    if (!profile?.id) return;
    const receiveSub = Notifications.addNotificationReceivedListener((event) => {
      const payload = event.request.content.data as Record<string, unknown>;
      const id = String(payload.id ?? Date.now());
      addNotification({
        id,
        user_id: profile.id,
        type: (payload.type as "blood_request" | "sos" | "response" | "system") ?? "system",
        title: String(event.request.content.title ?? "Notification"),
        body: String(event.request.content.body ?? ""),
        data: payload,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((event) => {
      const payload = event.notification.request.content.data as { request_id?: string };
      if (payload?.request_id) router.push(`/requests/${payload.request_id}`);
    });

    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;
        
        // This can fail if Firebase is not initialized on Android
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        
        if (token && token !== profile.push_token) {
          await supabase.from("profiles").update({ push_token: token }).eq("id", profile.id);
        }
      } catch (err) {
        console.warn("Push notifications setup failed (Firebase likely not configured):", err);
      }
    })();

    return () => {
      receiveSub.remove();
      responseSub.remove();
    };
  }, [addNotification, profile?.id, profile?.push_token]);
}
