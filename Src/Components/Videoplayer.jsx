import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const VideoPlayer = ({video, videoDetails, onPlayPress}) => {
  const details = videoDetails[video.videoId] || {};

  return (
    <View style={styles.contentCard}>
      <TouchableOpacity
        style={styles.thumbnailContainer}
        activeOpacity={0.8}
        onPress={onPlayPress}
        delayPressIn={0}
        delayPressOut={0}>
        <Image
          source={{
            uri:
              details.thumbnailUrl ||
              `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
          }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.playOverlay}>
          <View style={styles.playButtonCircle}>
            <MaterialIcons name="play-arrow" size={WP(12)} color="#FFFFFF" />
          </View>
        </View>
        {details.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{details.duration}</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <MaterialIcons name="videocam" size={WP(3)} color="#FFFFFF" />
          <Text style={styles.typeBadgeText}>VIDEO</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.contentInfoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.channelAvatar}>
            <MaterialIcons name="videocam" size={WP(5)} color="#FFFFFF" />
          </View>
          <View style={styles.contentDetails}>
            <Text style={styles.contentTitle} numberOfLines={2}>
              {details.title || video.title || 'YouTube Video'}
            </Text>
            <Text style={styles.channelName}>
              {details.channelName || 'YouTube Channel'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: HP(1),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thumbnailContainer: {
    width: '100%',
    height: HP(25),
    backgroundColor: '#000000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  playButtonCircle: {
    width: WP(18),
    height: WP(18),
    borderRadius: WP(9),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: WP(2),
    right: WP(2),
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: WP(1.5),
    paddingVertical: HP(0.3),
    borderRadius: WP(0.5),
  },
  durationText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  typeBadge: {
    position: 'absolute',
    top: WP(2),
    left: WP(2),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.5),
    borderRadius: WP(1),
  },
  typeBadgeText: {
    fontSize: FS(1),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    marginLeft: WP(1),
  },
  contentInfoContainer: {
    paddingHorizontal: WP(3),
    paddingVertical: HP(1.5),
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  channelAvatar: {
    width: WP(9),
    height: WP(9),
    borderRadius: WP(4.5),
    backgroundColor: colors.Primary || '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  contentDetails: {
    flex: 1,
  },
  contentTitle: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    lineHeight: FS(2.1),
    marginBottom: HP(0.5),
  },
  channelName: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
    marginTop: HP(0.2),
  },
});

export default VideoPlayer;
