import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import BackIcon from 'react-native-vector-icons/Ionicons';
import {HP, WP, FS} from '../utils/dimentions';

const Headers = ({title = 'Set Your First Goal', children}) => {
  return (
    <View
      style={{
        width: '92%',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
      <TouchableOpacity style={{marginTop: HP(0.25)}}>
        <BackIcon name="chevron-back-outline" size={WP(6.5)} color="#3B3B3B" />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: FS(1.97),
          fontFamily: 'OpenSans-Bold',
          textAlign: 'center',
          color: '#3B3B3B',
          lineHeight: HP(2.5),
          flex: 1,
          marginHorizontal: WP(7.27),
          marginTop: HP(0.5),
        }}>
        {title}
      </Text>
      {children ? children : <View></View>}
    </View>
  );
};

export default Headers;
