import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { ScanScreen } from "./ScanScreen";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScanScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});


