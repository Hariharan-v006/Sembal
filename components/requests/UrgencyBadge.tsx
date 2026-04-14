import { Text, View } from "react-native";
import { UrgencyLevel } from "@/lib/types";

const styles: Record<UrgencyLevel, { container: string; text: string }> = {
  normal: { container: "bg-green-100", text: "text-green-700" },
  urgent: { container: "bg-orange-100", text: "text-orange-700" },
  critical: { container: "bg-red-100", text: "text-red-700" },
};

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  return (
    <View className={`rounded-full px-2 py-1 ${styles[urgency].container}`}>
      <Text className={`text-xs font-semibold ${styles[urgency].text}`}>{urgency.toUpperCase()}</Text>
    </View>
  );
}
