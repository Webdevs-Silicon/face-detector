import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function SuccessScreen() {
  const params = useLocalSearchParams();
  const base64Preview = params.base64Preview as string;

  const handleGoBack = () => {
    router.replace("/");
  };

  const handleTryAgain = () => {
    router.replace("/camera");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.title}>Face Captured Successfully!</Text>
        <Text style={styles.subtitle}>
          Image has been processed and is ready to send to backend
        </Text>

        {base64Preview && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Base64 Preview:</Text>
            <Text style={styles.previewText} numberOfLines={2}>
              {base64Preview}...
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Pressable style={styles.primaryButton} onPress={handleTryAgain}>
            <Text style={styles.primaryButtonText}>Capture Another</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleGoBack}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "85%",
    alignItems: "center",
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 30,
  },
  previewContainer: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  previewLabel: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  previewText: {
    color: "white",
    fontSize: 12,
    fontFamily: "monospace",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
});
