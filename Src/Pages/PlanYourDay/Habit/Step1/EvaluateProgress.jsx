import React from "react";
import { Text, View, StyleSheet } from "react-native";
import Headers from "../../../../Components/Headers";
import { colors } from "../../../../Helper/Contants";

const EvaluateProgress = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <Headers title="How do you want to evaluate your progress?">
          <Text style={styles.nextText}>Next</Text>
        </Headers>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>With Yes or No</Text>
      </View>
      <Text style={styles.cardDescription}>
        Record whether you succeed with the activity or not
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>With Timer</Text>
      </View>
      <Text style={styles.cardDescription}>
        Establish a value as a daily goal or limit for the habit
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>With Checklist</Text>
      </View>
      <Text style={styles.cardDescription}>
        Evaluate your activity based on a set of sub-iteams
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>With Numeric Value</Text>
      </View>
      <Text style={styles.cardDescription}>
        Establish a time value as a daily goal or limit for the habit
      </Text>
    </View>
  );
};

export default EvaluateProgress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerWrapper: {
    marginTop: 15,
  },
  nextText: {
    fontSize: 16,
    color: colors.PRIMARY,
    fontWeight: "500",
  },
  card: {
    width: "90%",
    alignSelf: "center",
    elevation: 5,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  cardDescription: {
    textAlign: "center",
    width: "80%",
    alignSelf: "center",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "400",
    color: "#444",
  },
});
