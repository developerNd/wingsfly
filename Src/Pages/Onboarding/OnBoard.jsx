import React from 'react';
import {
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import Continue from '../../assets/Images/continue.svg';
import {useNavigation, useRoute} from '@react-navigation/native';
import {routes, Icons, colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const OnBoard = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const selectedGender = route.params?.selectedGender || 'Male';

  // Determine which hiker image to show based on gender
  const getHikerImage = () => {
    return selectedGender === 'Male' ? Icons.ManHiker : Icons.WomenHiker;
  };

  // Get hiker container styles based on gender
  const getHikerContainerStyle = () => {
    return selectedGender === 'Male'
       ? styles.hikerImageContainer
       : styles.hikerImageContainerWomen;
  };

  // Get hiker image styles based on gender
  const getHikerImageStyle = () => {
    return selectedGender === 'Male'
       ? styles.hikerImage
       : styles.hikerImageWomen;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#161D74" barStyle="light-content" />
      <ImageBackground
        style={styles.backgroundImage}
        source={Icons.Preview}
        resizeMode="cover">
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Plan your goals easiest{'\n'}way possible.
          </Text>
          <Text style={styles.subtitle}>
            Find interesting methods, designs &{'\n'}create plan utmost detail
            for your goals.
          </Text>
        </View>

        <View style={getHikerContainerStyle()}>
          <Image
            source={getHikerImage()}
            style={getHikerImageStyle()}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate(routes.TASKSLECTION_SCREEN, {
              selectedGender: selectedGender,
            })
          }
          activeOpacity={0.8}>
          <Continue width={WP(60)} height={HP(12.5)} />
        </TouchableOpacity>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default OnBoard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161D74',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: -1, // Small negative margin to eliminate any gaps
    marginHorizontal: -1, // Eliminate side gaps
  },
  contentContainer: {
    width: '85%',
    alignSelf: 'center',
    marginTop: HP(7.7),
    marginLeft: WP(1)
  },
  title: {
    fontSize: FS(2.7),
    color: colors.White,
    width: '95%',
    alignSelf: 'center',
    lineHeight: FS(3.2),
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: FS(1.8),
    color: colors.White,
    width: '95%',
    alignSelf: 'center',
    marginTop: HP(2.2),
    lineHeight: FS(2.4),
    fontFamily: 'Poppins-Light',
  },
  // Men hiker styles (current perfect styles)
  hikerImageContainer: {
    position: 'absolute',
    right: WP(6.8),
    bottom: HP(16.5),
    zIndex: 1,
  },
  hikerImage: {
    width: WP(38.6),
    height: HP(38.5),
  },
  hikerImageContainerWomen: {
    position: 'absolute',
    right: WP(13.8), 
    bottom: HP(19), 
    zIndex: 1,
  },
  hikerImageWomen: {
    width: WP(32), 
    height: HP(31),
  },
  button: {
    width: WP(60),
    height: HP(11.5),
    position: 'absolute',
    bottom: HP(2.4),
    right: WP(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
});