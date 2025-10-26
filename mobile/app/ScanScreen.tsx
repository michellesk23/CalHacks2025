import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { getEligibilityInput } from "../src/data";

export function ScanScreen() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const onLookup = useCallback(async () => {
    setError(null);
    setResult(null);
    if (!barcode.trim()) {
      setError("Enter a barcode");
      return;
    }
    setLoading(true);
    const res = await getEligibilityInput(barcode.trim());
    setLoading(false);
    if (res.ok) {
      setResult(res.data);
    } else {
      if (res.reason === "not_found") setError("Product not found");
      else if (res.reason === "network_error") setError("Network error");
      else setError("Lookup failed");
    }
  }, [barcode]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>SnapCheck (Manual Lookup)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter barcode (e.g., 04963406)"
        value={barcode}
        onChangeText={setBarcode}
        keyboardType="number-pad"
        returnKeyType="search"
        onSubmitEditing={onLookup}
      />
      <Button title="Lookup" onPress={onLookup} disabled={loading} />
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Fetching product…</Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{result.name || "Unnamed product"}</Text>
          <Text style={styles.cardSub}>{result.brand || ""}</Text>
          <Text style={styles.section}>Barcode</Text>
          <Text style={styles.value}>{result.barcode}</Text>
          <Text style={styles.section}>Categories</Text>
          <Text style={styles.value}>{result.categories.join(", ") || "—"}</Text>
          <Text style={styles.section}>Ingredients</Text>
          <Text style={styles.value}>{result.ingredientsText || "—"}</Text>
          <Text style={styles.section}>Juice %</Text>
          <Text style={styles.value}>{result.juicePercent ?? "Unknown"}</Text>
          <Text style={styles.section}>Nutrients (per 100g)</Text>
          <Text style={styles.value}>{JSON.stringify(result.nutrients)}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    marginLeft: 8,
  },
  error: {
    color: "#b00020",
  },
  card: {
    borderColor: "#eee",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardSub: {
    color: "#666",
    marginBottom: 8,
  },
  section: {
    marginTop: 8,
    fontWeight: "600",
  },
  value: {
    color: "#333",
  },
});


