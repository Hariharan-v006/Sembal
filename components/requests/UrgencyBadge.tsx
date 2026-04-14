import { StyleSheet, Text, View } from "react-native";
import { UrgencyLevel } from "@/lib/types";

const COLORS = {
  normal: { bg: "#E8F5E9", text: "#2E7D32" },
  urgent: { bg: "#FFF3E0", text: "#E65100" },
  critical: { bg: "#FFEBEE", text: "#C62828" },
};

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const color = COLORS[urgency] || COLORS.normal;
  
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.text, { color: color.text }]}>
        {urgency.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
