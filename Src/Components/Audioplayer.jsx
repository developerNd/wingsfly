import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {State} from 'react-native-track-player';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const AudioPlayer = ({audio, isPlaying, playbackState, onPlayPress}) => {
  const isCurrentlyPlaying = playbackState.state === State.Playing && isPlaying;
  const isBuffering = playbackState.state === State.Buffering && isPlaying;

  return (
    <TouchableOpacity
      style={styles.audioCard}
      activeOpacity={0.8}
      onPress={onPlayPress}
      delayPressIn={0}
      delayPressOut={0}>
      {/* Portrait Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{
            uri:
              audio.thumbnail ||
              'https://via.placeholder.com/300/1DB954/FFFFFF?text=🎵',
          }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {/* Play Icon Overlay */}
        {!isPlaying && (
          <View style={styles.playIconOverlay}>
            <View style={styles.playIconCircle}>
              <MaterialIcons name="play-arrow" size={WP(8)} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Now Playing or Buffering Indicator */}
        {isPlaying && (
          <View style={styles.nowPlayingBadge}>
            {isBuffering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="graphic-eq" size={WP(4)} color="#FFFFFF" />
            )}
          </View>
        )}
      </View>

      {/* Audio Title */}
      <Text style={styles.audioTitle} numberOfLines={2}>
        {audio.title || audio.name || 'Audio File'}
      </Text>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <MaterialIcons
          name={isCurrentlyPlaying ? 'volume-up' : 'audiotrack'}
          size={WP(3.5)}
          color="#606060"
        />
        <Text style={styles.audioSubtitle} numberOfLines={1}>
          {isCurrentlyPlaying ? 'Now Playing' : 'Audio Track'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  audioCard: {
    width: WP(40),
    marginRight: WP(3),
    backgroundColor: '#FFFFFF',
    borderRadius: WP(2),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: '100%',
    height: WP(50),
    position: 'relative',
    backgroundColor: '#000000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playIconCircle: {
    width: WP(14),
    height: WP(14),
    borderRadius: WP(7),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nowPlayingBadge: {
    position: 'absolute',
    top: WP(2),
    right: WP(2),
    backgroundColor: colors.Primary || '#1DB954',
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.5),
    borderRadius: WP(1),
    minWidth: WP(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    paddingHorizontal: WP(2),
    paddingTop: HP(1),
    lineHeight: FS(1.8),
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WP(2),
    paddingTop: HP(0.3),
    paddingBottom: HP(1.2),
  },
  audioSubtitle: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
    marginLeft: WP(1),
  },
});

export default AudioPlayer;
