import { StyleSheet, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BloodRequest } from "@/lib/types";
import { formatDistance, formatTimeAgo } from "@/lib/utils";
import { UrgencyBadge } from "./UrgencyBadge";
import { Ionicons } from "@expo/vector-icons";

export function RequestCard({ request }: { request: BloodRequest }) {
  return (
    <Pressable
      style={[styles.card, request.is_sos && styles.sosCard]}
      onPress={() => router.push(`/requests/${request.id}`)}
    >
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <UrgencyBadge urgency={request.urgency} />
          {request.is_sos && (
            <View style={styles.sosBadge}>
              <Text style={styles.sosText}>EMERGENCY</Text>
            </View>
          )}
        </View>
        <View style={styles.bloodBadge}>
          <Text style={styles.bloodText}>{request.blood_group}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.patientName}>{request.patient_name}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.hospitalName} numberOfLines={1}>{request.hospital_name}</Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.infoItem}>
            <Ionicons name="water-outline" size={14} color="#C62828" />
            <Text style={styles.infoText}>{request.units_needed} units</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="navigate-outline" size={14} color="#666" />
            <Text style={styles.infoText}>
              {typeof request.distance === "number" ? formatDistance(request.distance) : "--"}
            </Text>
          </View>
        </View>

        <View style={styles.timeTag}>
          <Text style={styles.timeText}>{formatTimeAgo(request.created_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  sosCard: {
    borderColor: "#FFCDD2",
    backgroundColor: "#FFF9F9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    display: "flex",
    flexWrap: "nowrap",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  sosBadge: {
    backgroundColor: "#C62828",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sosText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  bloodBadge: {
    backgroundColor: "#C62828",
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C62828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bloodText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  content: {
    marginTop: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  hospitalName: {
    fontSize: 13,
    color: "#666666",
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444444",
  },
  timeTag: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  timeText: {
    fontSize: 10,
    color: "#A0A0A0",
    fontWeight: "500",
  },
});
