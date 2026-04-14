import { Text, View } from "react-native";

export default function TestTailwind() {
  return (
    <View className="flex-1 bg-red-600 items-center justify-center">
      <View className="bg-white p-6 rounded-2xl shadow-lg">
        <Text className="text-red-600 text-2xl font-bold text-center">
          Tailwind is Working!
        </Text>
        <Text className="text-zinc-500 mt-2 text-center">
          If you see a red background and this white card, NativeWind is configured correctly.
        </Text>
      </View>
    </View>
  );
}
