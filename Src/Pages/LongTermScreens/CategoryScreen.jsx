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
import {HP, WP, FS} from '../../utils/dimentions';
import {useRoute, useNavigation} from '@react-navigation/native';

const categoriesData = [
  {
    id: 1,
    title: 'Work & Career',
    images: {
      female: Icons.Work,
      male: Icons.Men1,
    },
  },
  {
    id: 2,
    title: 'Health & Wellness',
    images: {
      female: Icons.Health,
      male: Icons.Men2,
    },
  },
  {
    id: 3,
    titles: {
      female: 'Love And Family',
      male: 'Love & Relationship',
    },
    images: {
      female: Icons.Family,
      male: Icons.Men3,
    },
  },
  {
    id: 4,
    title: 'Money & Finances',
    images: {
      female: Icons.Money,
      male: Icons.Men4,
    },
  },
  {
    id: 5,
    title: 'Spirtuality & Faith',
    images: {
      female: Icons.Faith,
      male: Icons.Men5,
    },
  },
  {
    id: 6,
    title: 'Personal & Growth',
    images: {
      female: Icons.Growth,
      male: Icons.Men6,
    },
  },
  {
    id: 7,
    title: 'Other Goals',
    images: {
      female: Icons.Other,
      male: Icons.Men7,
    },
  },
  {
    id: 8,
    title: 'Create a category',
    images: {
      female: Icons.Create,
      male: Icons.Men8,
    },
  },
];

const Category = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const selectedGender = route.params?.selectedGender;

  const userGender = selectedGender.toLowerCase();

  const handleCategoryPress = category => {
    console.log('Category selected:', category);
    console.log('Current gender:', selectedGender);

    navigation.navigate('GoalScreen', {
      selectedCategory: {
        title: category.title,
        image: category.image,
        id: category.id,
      },
      selectedGender: selectedGender,
    });
  };

  const getCategories = () => {
    return categoriesData.map(category => ({
      ...category,
      title: category.titles ? category.titles[userGender] : category.title,
      image: category.images[userGender],
    }));
  };

  const categories = getCategories();

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
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
    marginBottom: HP(0.7),
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
    height: HP(22),
    borderRadius: WP(2.67),
    marginBottom: HP(1.5),
  },
  titleContainer: {
    width: WP(42.2),
    height: HP(4),
    alignItems: 'center',
    backgroundColor: colors.White,
    paddingVertical: HP(0.8),
    paddingHorizontal: WP(2),
    borderRadius: WP(2),
    marginTop: HP(-6.7),
    marginLeft: WP(0.4),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2.5,
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
    marginTop: HP(-0.4),
  },
  customAddIcon: {
    width: WP(3.1),
    height: WP(3.1),
    tintColor: colors.White,
  },
});

export default Category;
