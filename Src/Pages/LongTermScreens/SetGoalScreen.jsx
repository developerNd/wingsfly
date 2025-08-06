import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const SetLongTermGoal = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const goalData = route.params || {};

  const [goalName, setGoalName] = useState('');
  const [note, setNote] = useState('');

  const handleNextPress = () => {
    const longTermGoalData = {
      ...goalData,
      goalName,
      note,
    };

    console.log('Long Term Goal data:', longTermGoalData);
    navigation.navigate('MindMapScreen', longTermGoalData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Set Long Term Goal">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentContainer}>
            <View style={styles.mainImageContainer}>
              <Image
                source={Icons.LongGoal}
                style={styles.goalImage}
                resizeMode="contain"
              />

              <TouchableOpacity style={styles.changeImageButton}>
                <Image source={Icons.Camera} style={styles.cameraIcon} />
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Goal Name"
                  placeholderTextColor={colors.Black}
                  value={goalName}
                  onChangeText={setGoalName}
                />
                <View style={styles.divider} />
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  placeholder="Enter Note"
                  placeholderTextColor={colors.Black}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SetLongTermGoal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#151B73',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: WP(4),
    paddingBottom: HP(3),
    marginTop: HP(-7.5),
  },
  mainImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  goalImage: {
    width: WP(94),
    height: HP(50),
  },
  changeImageButton: {
    position: 'absolute',
    top: HP(10.6),
    left: WP(2.4),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    paddingHorizontal: WP(1.5),
    paddingVertical: HP(1),
    borderRadius: WP(1.2),
    borderWidth: 0.2,
    borderColor: '#626262',
  },
  cameraIcon: {
    width: WP(4),
    height: WP(4),
    marginRight: WP(2),
    tintColor: '#666',
    resizeMode: 'contain',
  },
  changeImageText: {
    fontSize: FS(1.2),
    color: colors.Black,
    fontFamily: 'OpenSans-SemiBold',
  },
  inputContainer: {
    position: 'absolute',
    bottom: HP(11.4),
    left: WP(2),
    right: WP(8),
    backgroundColor: colors.White,
    borderRadius: WP(1.2),
    borderWidth: 0.35,
    borderColor: '#868686',
    width: WP(88),
    height: HP(9),
  },
  input: {
    paddingHorizontal: WP(3.2),
    paddingVertical: HP(0.3),
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    backgroundColor: 'transparent',
  },
  noteInput: {
    borderTopWidth: 0,
  },
  divider: {
    height: 0.3,
    backgroundColor: '#868686',
  },
});
