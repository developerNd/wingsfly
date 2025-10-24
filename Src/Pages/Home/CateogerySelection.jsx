import React from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors, Icons} from '../../Helper/Contants';
import {useNavigation, useRoute} from '@react-navigation/native';
import {HP, WP, FS} from '../../utils/dimentions';

const categories = [
  {id: 1, title: 'Work & Career', image: Icons.Work},
  {id: 2, title: 'Health & Wellness', image: Icons.Health},
  {id: 3, title: 'Love & Relationship', image: Icons.Love},
  {id: 4, title: 'Money & Finances', image: Icons.Money},
  {id: 5, title: 'Spirtuality & Faith', image: Icons.Faith},
  {id: 6, title: 'Personal & Growth', image: Icons.Growth},
  {id: 7, title: 'Other Goals', image: Icons.Other},
  {id: 8, title: 'Create a category', image: Icons.Create},
];

const CateogerySelection = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Extract the type parameter from route params
  const {type} = route.params || {};

  const handleCategoryPress = category => {
    // Check if the type is 'Goal' (Challenge) and navigate to CreateChallengeScreen
    if (type === 'Goal') {
      navigation.navigate('CreateChallengeScreen', {
        type: type,
        selectedCategory: category,
      });
    } else {
      navigation.navigate('EvaluateProgress', {
        type: type,
        selectedCategory: category,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <Headers title="Select Category">
          <Text style={styles.nextText}>Next</Text>
        </Headers>
      </View>

      <ScrollView contentContainerStyle={styles.gridWrapper}>
        {categories.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => handleCategoryPress(item)}>
            <Image
              resizeMode="cover"
              source={item.image}
              style={styles.image}
            />

            <View style={styles.titleContainer}>
              {item.id === 8 ? (
                <View style={styles.createCategoryContent}>
                  <Text style={styles.buttonText}>{item.title}</Text>
                  <View style={styles.plusIcon}>
                    <Image
                      source={Icons.Plus}
                      style={styles.customAddIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : (
                <Text style={styles.buttonText}>{item.title}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerWrapper: {
    marginTop: HP(2.5),
    marginBottom: HP(0.625),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    marginTop: HP(0.5),
    fontFamily: 'OpenSans-Bold',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: WP(2.9),
    paddingBottom: HP(1.25),
  },
  card: {
    width: WP(44),
    marginVertical: HP(1),
    alignItems: 'center',
  },
  image: {
    width: WP(47),
    height: HP(21.4),
    borderRadius: WP(2.67),
    marginBottom: HP(1.4),
  },
  titleContainer: {
    width: WP(42.4),
    height: HP(4),
    alignItems: 'center',
    backgroundColor: colors.White,
    paddingVertical: HP(0.8),
    paddingHorizontal: WP(2),
    borderWidth: WP(0.08),
    borderColor: '#535353',
    borderRadius: WP(1.33),
    marginTop: HP(-6.4),
    marginLeft: WP(0.4),
  },
  buttonText: {
    fontSize: FS(1.55),
    color: '#141414',
    fontFamily: 'OpenSans-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
  createCategoryContent: {
    flexDirection: 'row',
  },
   plusIcon: {
    width: WP(6.5),
    height: WP(6.5),
    borderRadius: WP(2.3),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: WP(3.8),
    marginTop: HP(-0.5),
  },
  customAddIcon: {
    width: WP(3.1),
    height: WP(3.1),
    tintColor: colors.White,
  },
});

export default CateogerySelection;