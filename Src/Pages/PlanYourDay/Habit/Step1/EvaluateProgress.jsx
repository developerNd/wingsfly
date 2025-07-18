import React from "react";
import { Text, View, StyleSheet, TouchableOpacity, StatusBar, Image } from "react-native";
import Headers from "../../../../Components/Headers";
import { colors } from "../../../../Helper/Contants";

const EvaluateProgress = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers title="How do you want to evaluate your progress?">
          <Text style={styles.nextText}>Next</Text>
        </Headers>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.optionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image 
              source={require('../../../../assets/Images/arrow.png')} 
              style={styles.arrowImage}
            />
            <Text style={styles.optionTitle}>Yes</Text>
            <Image 
              source={require('../../../../assets/icons/ring.png')}  
              style={styles.radioButtonImage}
            />
            <Text style={styles.orText}>or</Text>
            <Text style={styles.optionTitle}>No</Text>
            <Image 
              source={require('../../../../assets/icons/ring.png')} 
              style={styles.radioButtonImage}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.cardDescription}>
          Record whether you succeed with the activity or not
        </Text>

        <TouchableOpacity style={styles.optionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image 
              source={require('../../../../assets/Images/arrow.png')}
              style={styles.arrowImage}
            />
            <Text style={styles.optionTitle}>Timer</Text>
            <Image 
              source={require('../../../../assets/Images/time.png')}
              style={styles.iconStyle}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.cardDescription}>
          Establish a value as a daily goal or limit for the habit
        </Text>

        <TouchableOpacity style={styles.optionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image 
              source={require('../../../../assets/Images/arrow.png')}
              style={styles.arrowImage}
            />
            <Text style={styles.optionTitle}>Checklist</Text>
            <Image 
              source={require('../../../../assets/Images/check.png')}
              style={styles.iconStyle}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.cardDescription}>
          Evaluate your activity based on a set of sub-items
        </Text>

        <TouchableOpacity style={styles.optionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.withText}>With</Text>
            <Image 
              source={require('../../../../assets/Images/arrow.png')}
              style={styles.arrowImage}
            />
            <Text style={styles.optionTitle}>a Numeric Value</Text>
            <Image 
              source={require('../../../../assets/Images/numeric.png')}
              style={styles.iconStyle}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.cardDescription}>
          Establish a time value as a daily goal or limit for the habit
        </Text>
      </View>

      <View style={styles.progressIndicator}>
        <View style={styles.progressDotActive}>
          <View style={styles.progressDotActiveInner}>
            <Text style={styles.progressDotTextActive}>1</Text>
          </View>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotInactive}>
          <Text style={styles.progressDotTextInactive}>2</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotInactive}>
          <Text style={styles.progressDotTextInactive}>3</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotInactive}>
          <Text style={styles.progressDotTextInactive}>4</Text>
        </View>
      </View>
    </View>
  );
};

export default EvaluateProgress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerWrapper: {
    marginTop: 20,
    paddingBottom: 2,
  },
  nextText: {
    fontSize: 14,
    color: "#0059FF",
    fontFamily: "OpenSans-Bold",
    marginTop: 4
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 7.5,
    marginBottom: 13,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  withText: {
    fontSize: 15,
    fontFamily: "OpenSans-SemiBold",
    color: "#000",
    marginRight: 10,
    marginTop: 6.5,
    marginLeft: 16
  },
  arrowImage: {
    width: 18,
    height: 12,
    marginRight: 10,
    marginTop: 6.5,
    resizeMode: 'contain',
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: "OpenSans-SemiBold",
    color: "#000000",
    marginRight: 8,
    marginTop: 6.5
  },
  radioButtonImage: {
    width: 12,
    height: 12,
    marginRight: 8,
    marginTop: 8.5,
    resizeMode: 'contain',
  },
  orText: {
    fontSize: 16,
    color: "#000000",
    fontFamily: "OpenSans-SemiBold",
    marginRight: 8,
    marginTop: 6.5
  },
  iconStyle: {
    width: 12,
    height: 12,
    marginLeft: 1,
    resizeMode: 'contain',
    marginTop: 9
  },
  cardDescription: {
    fontSize: 12,
    color: "#000000",
  //  lineHeight: 20,
    fontFamily: "OpenSans-Regular",
    marginHorizontal: 5,
    marginBottom: 18,
    alignItems: "center",
    textAlign: "center",
    width: "100%"
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  progressDotActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#151B73",
  },
  progressDotActiveInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#151B73",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotTextActive: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "OpenSans-Bold",
  },
  progressDotInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "transparent", 
    borderWidth: 2, 
    borderColor: "#151B73", 
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotTextInactive: {
    color: "#151B73", 
    fontSize: 9,
    fontFamily: "OpenSans-Bold",
  },
  progressLine: {
    width: 20,
    height: 1.3,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: "#151B73",
  },
});