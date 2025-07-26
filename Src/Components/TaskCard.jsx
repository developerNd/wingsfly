import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const TaskCard = ({item, checkboxState, onToggle}) => {
  const getFlagColor = () => {
    if (item.tags && item.tags.some(tag => tag.toLowerCase() === 'important')) {
      return colors.Primary;
    }
    return '#AF0000';
  };

  const getTimeTextColor = () => {
    const colorMap = {
      1: '#0E4C92',
      2: '#800080',
      3: '#C1A300',
      4: '#228B22',
      5: '#F37A29',
      6: '#006D5B',
    };
    return colorMap[item.id] || '#2E5BFF';
  };

  const getTimeIconColor = () => {
    const colorMap = {
      1: '#0E4C92',
      2: '#800080',
      3: '#C1A300',
      4: '#228B22',
      5: '#F37A29',
      6: '#006D5B',
    };
    return colorMap[item.id] || '#1A4BFF';
  };

  const renderCheckbox = () => {
    switch (checkboxState) {
      case 1:
        return (
          <Image
            source={Icons.Tick}
            style={{width: WP(5.3), height: WP(5.3)}}
          />
        );
      case 1:
        return <View style={styles.staticCircle} />;
      case 2:
        return (
          <Image
            source={Icons.Time}
            style={{width: WP(5.3), height: WP(5.3)}}
          />
        );
      case 3:
        return <View style={styles.staticCircle} />;
      case 4:
        return (
          <View style={styles.staticCircle}>
            <Image source={Icons.Check} style={styles.iconInsideCircle} />
          </View>
        );
      default:
        return <View style={styles.staticCircle} />;
    }
  };

  return (
    <View style={styles.taskContainer}>
      <Image source={item.image} style={styles.taskImage} />
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{item.title}</Text>

        <View style={styles.taskMeta}>
          <View
            style={[
              styles.timeBox,
              {backgroundColor: item.timeColor || '#0E4C92'},
            ]}>
            <Icon
              name="access-time"
              size={WP(2.1)}
              color={getTimeIconColor()}
              marginRight={WP(0.5)}
            />
            <Icon
              name="hourglass-top"
              size={WP(2.1)}
              color={getTimeIconColor()}
              marginRight={WP(0.3)}
            />
            <Text style={[styles.timeText, {color: getTimeTextColor()}]}>
              {item.time}
            </Text>
          </View>

          {item.progress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{item.progress}</Text>
            </View>
          )}

          <View style={styles.tagsContainer}>
            <View style={styles.combinedTagContainer}>
              {item.tags.map((tag, index) => (
                <Text key={index} style={styles.tagText}>
                  {tag}
                  {index < item.tags.length - 1 && (
                    <Text style={styles.separator}> | </Text>
                  )}
                </Text>
              ))}
              {item.hasFlag && (
                <View style={styles.flagContainer}>
                  <Icon name="flag" size={WP(3.2)} color={getFlagColor()} />
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.bottomBorder} />
      </View>

      <TouchableOpacity style={styles.checkboxContainer} onPress={onToggle}>
        {renderCheckbox()}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: WP(1.3),
    marginBottom: HP(0.125),
    paddingBottom: HP(1.95),
    backgroundColor: colors.White,
  },
  taskImage: {
    width: WP(14.1),
    height: WP(14.1),
    resizeMode: 'contain',
    marginRight: WP(2.7),
    marginLeft: WP(1.9),
  },
  taskInfo: {
    flex: 1,
    position: 'relative',
  },
  taskTitle: {
    fontSize: FS(1.82),
    fontFamily: 'Roboto-SemiBold',
    color: '#434343',
    marginBottom: HP(0.4),
    lineHeight: HP(2.5),
    width: '100%',
  },
  timeSection: {
    marginBottom: HP(0.75),
  },
  timeBox: {
    flexDirection: 'row',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(0.9),
    marginRight: WP(0.8),
    paddingVertical: HP(0.25),
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  timeText: {
    marginLeft: WP(0.5),
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: HP(0.9),
  },
  progressContainer: {
    backgroundColor: '#F6F6F6',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(2.25),
    paddingVertical: HP(0.25),
    marginRight: WP(0.8),
  },
  progressText: {
    fontSize: FS(1.2),
    color: '#6C6C6C',
    fontFamily: 'OpenSans-SemiBold',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  combinedTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: WP(1.1),
    paddingHorizontal: WP(1.1),
    paddingVertical: HP(0.2),
    marginRight: WP(1.6),
  },
  tagText: {
    fontSize: FS(1.2),
    color: '#6C6C6C',
    fontFamily: 'OpenSans-SemiBold',
  },
  separator: {
    color: '#6C6C6C',
    fontSize: FS(1.2),
  },
  flagContainer: {
    marginLeft: 0,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: HP(-1.7),
    left: 0,
    right: WP(-16.0),
    height: HP(0.1),
    backgroundColor: '#DAD8D8',
  },
  checkboxContainer: {
    marginLeft: WP(2.7),
    padding: WP(1.1),
    marginRight: WP(1.2),
  },
  staticCircle: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: '#E7E7E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInsideCircle: {
    width: WP(2.7),
    height: WP(2.7),
    resizeMode: 'contain',
  },
});

export default TaskCard;
