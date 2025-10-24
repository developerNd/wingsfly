// playbackService.js - Place this in the same folder as YouTubeVideosScreen.js
import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('Remote play');
    TrackPlayer.play();
  });
  
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('Remote pause');
    TrackPlayer.pause();
  });
  
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('Remote stop');
    TrackPlayer.destroy();
  });
};