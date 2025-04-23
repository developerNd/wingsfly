import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Image,
  FlatList,
  ScrollView,
  StyleSheet
} from "react-native";
import Header from "../../Components/Header";
import Title from "../../Components/Title";
import DayfilterSlider from "../../Components/DayFilterSlider";
import SearchIcon from 'react-native-vector-icons/Feather';
import BookMark from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get("window");

const Jobs = () => {
  const jobstypes = ["NEW JOBS", "IN PROGRESS", "APPLIED", "SAVED JOBS", "REJECTED"];
  const [activeTab, setActiveTab] = useState(jobstypes[0]);
  const tabWidth = width * 0.9 / jobstypes.length;

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.innerContainer}>
        <Title name="JOBS" />

        {/* Search Box */}
        <View style={styles.searchBox}>
          <TextInput placeholder="Search jobs" style={styles.searchInput} />
          <SearchIcon style={styles.searchIcon} name="search" size={20} color="#fff" />
        </View>

        {/* Job Tabs with underline */}
        <View style={styles.tabContainer}>
          <View style={[
            styles.tabUnderline,
            {
              width: tabWidth,
              left: tabWidth * jobstypes.findIndex(tab => tab === activeTab)
            }
          ]} />

          <View style={styles.tabRow}>
            {jobstypes.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setActiveTab(item)}
                style={{ width: tabWidth, alignItems: 'center' }}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === item && styles.activeTabText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView>
          <DayfilterSlider />

          <Text style={styles.resultText}>
            Showing <Text style={styles.resultCount}>10</Text> results
          </Text>

          <FlatList
            data={[1, 1]}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Image source={require('../../Assets/Images/jobs.png')} />
                  <View style={styles.cardContent}>
                    <Text style={styles.jobTitle}>Restaurant Helper</Text>
                    <Text style={styles.jobDesc}>
                      We are looking for dedicated restaurant helpers to assist with daily operations and ensure smooth service for our customers...
                    </Text>
                  </View>
                  <BookMark name="bookmark" size={20} color="#000" />
                </View>

                <View style={styles.tagsRow}>
                  <Text style={styles.tag}>Kitchen Assistant</Text>
                  <Text style={styles.tag}>Restaurant Staff</Text>
                  <Text style={styles.tag}>Customer Service</Text>
                </View>

                <Text style={styles.locationText}>
                  <BookMark name="map-pin" size={10} color="#000" /> 94th, Ground & 1st Floor, Durga Bhawan, Mahatma Gandhi Marg, Mall Road, Delhi cant, New Delhi
                </Text>

                <View style={styles.bottomRow}>
                  <Text style={styles.salaryText}>Salary : ₹35,000</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>4.0/5.0</Text>
                    <Text style={styles.dateText}>Sun, 5 Jan 2024</Text>
                  </View>
                </View>
              </View>
            )}
          />
          <View style={{marginBottom:200}}></View>
        </ScrollView>
      </View>
    </View>
  );
};

export default Jobs;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  innerContainer: {
    backgroundColor: "#fff",
    flexGrow: 1,
    height: "100%",
    bottom: 20,
    borderTopEndRadius: 24,
    borderTopLeftRadius: 24
  },
  searchBox: {
    width: "90%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#D6D7DB",
    height: 46,
    borderRadius: 22,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  searchInput: {
    paddingLeft: 15
  },
  searchIcon: {
    backgroundColor: "#3366FF",
    marginRight: 8,
    padding: 6,
    borderRadius: 100
  },
  tabContainer: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#fff",
    position: "relative",
    marginTop: 20
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    height: 2,
    backgroundColor: "#3366FF",
    borderRadius: 2,
    elevation: 10
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 5
  },
  tabText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000"
  },
  activeTabText: {
    color: "#3366FF"
  },
  resultText: {
    width: "90%",
    alignSelf: "center",
    marginTop: 20,
    fontSize: 12,
    fontWeight: "500",
    color: "#3E3E3E"
  },
  resultCount: {
    color: "#000",
    fontWeight: "600"
  },
  card: {
    width: "90%",
    borderWidth: 1,
    alignSelf: "center",
    marginTop: 10,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    padding: 10
  },
  cardHeader: {
    flexDirection: "row"
  },
  cardContent: {
    width: "70%",
    marginLeft: 10
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000"
  },
  jobDesc: {
    fontWeight: "500",
    fontSize: 11,
    color: "#3E3E3E",
    marginTop: 2
  },
  tagsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "85%",
    marginTop: 10
  },
  tag: {
    fontSize: 9,
    fontWeight: "500",
    color: "#666666",
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 3
  },
  locationText: {
    marginTop: 8,
    fontSize: 9,
    fontWeight: "500",
    color: "#666666",
    width: "95%"
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 10
  },
  salaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000"
  },
  ratingRow: {
    flexDirection: "row"
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3366FF"
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
    marginLeft: 5
  }
});
