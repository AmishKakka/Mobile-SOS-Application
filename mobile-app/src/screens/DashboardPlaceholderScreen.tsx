import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function DashboardPlaceholderScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Placeholder screen. Dashboard UI will be added next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F1F3F6",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0E1E3A",
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    color: "#5C6A83",
  },
});
