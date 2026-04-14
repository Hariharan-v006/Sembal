import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C0392B",
        tabBarInactiveTintColor: "#AAAAAA",
        tabBarStyle: { height: 64, borderTopColor: "#E5E5E5" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "sembal",
          headerTitleStyle: { color: "#C0392B", fontWeight: "700", fontSize: 22 },
          headerRight: () => <NotificationBell />,
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          headerShown: false,
          tabBarIcon: () => (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#C0392B]">
              <Ionicons name="alert-circle" size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          headerTitle: "sembal",
          headerTitleStyle: { color: "#C0392B", fontWeight: "700", fontSize: 22 },
          headerRight: () => <NotificationBell />,
          tabBarIcon: ({ color }) => <Ionicons name="time" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
