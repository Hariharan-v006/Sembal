import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useNotificationStore } from "@/stores/notificationStore";
import { router } from "expo-router";

export function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return (
    <Pressable onPress={() => router.push("/notifications")} className="relative p-2">
      <Ionicons name="notifications" size={24} color="#1A1A1A" />
      {unreadCount > 0 ? (
        <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-[#C0392B] px-1">
          <Text className="text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
