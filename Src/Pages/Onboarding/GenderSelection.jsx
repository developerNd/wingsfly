import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {colors, routes, Icons} from '../../Helper/Contants';
import CustomButton from '../../Components/CustomButton';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../../supabase';
import {HP, WP, FS} from '../../utils/dimentions';

const GenderSelection = ({onContinue}) => {
  const [selectedGender, setSelectedGender] = useState('');
  const [loading, setLoading] = useState(false);
  const scaleFemale = new Animated.Value(1);
  const scaleMale = new Animated.Value(1);

  const navigation = useNavigation();
  const {completeProfileSetup} = useAuth();

  const handlePress = gender => {
    if (gender === 'Female') {
      Animated.spring(scaleFemale, {
        toValue: 1.1,
        friction: 5,
        useNativeDriver: true,
      }).start();
      setSelectedGender('Female');
    } else if (gender === 'Male') {
      Animated.spring(scaleMale, {
        toValue: 1.1,
        friction: 5,
        useNativeDriver: true,
      }).start();
      setSelectedGender('Male');
    }
  };

  const resetScale = () => {
    Animated.spring(scaleFemale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
    Animated.spring(scaleMale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleContinue = async () => {
    if (!selectedGender) return;

    setLoading(true);

    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');

      const {error} = await supabase
        .from('profiles')
        .update({gender: selectedGender})
        .eq('id', user.id);

      if (error) throw error;

      // ✅ Navigate AFTER updating DB
      navigation.navigate(routes.ONBOARD_SCREEN, {
        selectedGender,
        needsSetupCompletion: true,
      });
    } catch (error) {
      console.error('Error updating gender:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <StatusBar backgroundColor="#F5F5F5" barStyle="dark-content" />
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Select your gender</Text>
        <View style={styles.options}>
          <TouchableOpacity
            onPress={() => handlePress('Female')}
            onPressOut={resetScale}
            style={styles.option}>
            <Animated.View
              style={[
                styles.box,
                {transform: [{scale: scaleFemale}]},
                selectedGender === 'Female' && styles.selectedBox,
              ]}>
              <Image source={Icons.Female} style={styles.image} />
            </Animated.View>
            <Text
              style={[
                styles.label,
                selectedGender === 'Female' && styles.selectedLabel,
              ]}>
              Female
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handlePress('Male')}
            onPressOut={resetScale}
            style={styles.option}>
            <Animated.View
              style={[
                styles.box,
                {transform: [{scale: scaleMale}]},
                selectedGender === 'Male' && styles.selectedBox,
              ]}>
              <Image source={Icons.Male} style={styles.image} />
            </Animated.View>
            <Text
              style={[
                styles.label,
                selectedGender === 'Male' && styles.selectedLabel,
              ]}>
              Male
            </Text>
          </TouchableOpacity>
        </View>

        {selectedGender && (
          <CustomButton
            buttonStyle={[
              styles.continueButton,
              loading && styles.disabledButton,
            ]}
            TextStyle={styles.continueButtonText}
            text={loading ? 'Setting up...' : 'Continue'}
            loading={loading}
            onClick={handleContinue}
            disabled={loading}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#F5F5F5',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(5),
    paddingBottom: HP(2.5),
  },
  title: {
    fontSize: FS(2.9),
    fontWeight: 'bold',
    marginBottom: HP(5),
    color: colors.Primary,
  },
  options: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: HP(3.7),
  },
  option: {
    alignItems: 'center',
    marginHorizontal: WP(2.5),
  },
  box: {
    height: WP(33.5),
    width: WP(33.5),
    borderRadius: WP(3),
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: HP(1.2),
    elevation: 5,
  },
  selectedBox: {
    borderColor: colors.Primary,
    borderWidth: WP(0.75),
  },
  image: {
    height: WP(16),
    width: WP(16),
    resizeMode: 'contain',
  },
  label: {
    marginTop: HP(1),
    fontSize: FS(2.1),
    color: colors.Shadow,
  },
  selectedLabel: {
    fontWeight: 'bold',
    color: colors.Primary,
  },
  continueButton: {
    width: '80%',
    height: HP(6.6),
    backgroundColor: colors.Primary,
    marginTop: HP(2.5),
    borderRadius: WP(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: colors.White,
    fontSize: FS(2.3),
    fontWeight: '500',
  },
});

export default GenderSelection;
