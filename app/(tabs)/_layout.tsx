import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C0392B",
        tabBarInactiveTintColor: "#AAAAAA",
        tabBarStyle: { 
          height: Platform.OS === 'ios' ? 88 : 68, 
          borderTopColor: "#F0F0F0",
          backgroundColor: "#FFFFFF",
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: "#FFFFFF",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#F5F5F5",
        },
        headerTitleStyle: {
          color: "#C0392B",
          fontWeight: "900",
          fontSize: 22,
          letterSpacing: -0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "alert-circle" : "alert-circle-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
