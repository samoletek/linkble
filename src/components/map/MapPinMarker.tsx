import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import CategoryIcon from '../common/CategoryIcon';

interface MapPinMarkerProps {
  color: string;
  categoryName: string;
  size?: number;
}

export default function MapPinMarker({ color, categoryName, size = 40 }: MapPinMarkerProps) {
  const iconSize = size * 0.4;
  const iconOffset = size * 0.22;

  return (
    <View style={[styles.container, { width: size, height: size * 1.3 }]}>
      <Svg width={size} height={size * 1.3} viewBox="0 0 40 52">
        {/* Pin shadow */}
        <Path
          d="M20 50c0 0-16-18-16-32C4 9.2 11.2 2 20 2s16 7.2 16 16c0 14-16 32-16 32z"
          fill="rgba(0,0,0,0.15)"
          transform="translate(1, 2)"
        />
        {/* Pin body */}
        <Path
          d="M20 50c0 0-16-18-16-32C4 9.2 11.2 2 20 2s16 7.2 16 16c0 14-16 32-16 32z"
          fill={color}
        />
        {/* Inner circle with white border */}
        <Circle cx="20" cy="18" r="12" fill={color} stroke="white" strokeWidth="2.5" />
      </Svg>
      {/* Category icon */}
      <View style={[styles.iconContainer, { top: iconOffset, width: size, height: size * 0.5 }]}>
        <CategoryIcon categoryName={categoryName} size={iconSize} color="#FFFFFF" weight="bold" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
