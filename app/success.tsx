import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SuccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Face Detected Successfully!</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.buttonText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 22, marginBottom: 20 },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontSize: 16 },
});
