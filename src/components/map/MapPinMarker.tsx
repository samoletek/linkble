import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import CategoryIcon from '../common/CategoryIcon';
import { useTheme } from '../../contexts/ThemeContext';

interface MapPinMarkerProps {
  color: string;
  categoryName: string;
  size?: number;
}

export default function MapPinMarker({ color, categoryName, size = 40 }: MapPinMarkerProps) {
  const { activeTheme } = useTheme();
  const iconSize = size * 0.55;

  const pinColor = activeTheme === 'light' ? '#FFFFFF' : '#666666';

  return (
    <View style={[styles.container, { width: size, height: size * 1.3 }]}>
      <Svg width={size} height={size * 1.3} viewBox="0 0 40 52">
        {/* Pin shadow */}
        <Path
          d="M20 50c0 0-16-18-16-32C4 9.2 11.2 2 20 2s16 7.2 16 16c0 14-16 32-16 32z"
          fill="rgba(0,0,0,0.2)"
          transform="translate(1, 2)"
        />
        {/* Pin body - white or gray */}
        <Path
          d="M20 50c0 0-16-18-16-32C4 9.2 11.2 2 20 2s16 7.2 16 16c0 14-16 32-16 32z"
          fill={pinColor}
        />
        {/* Inner colored circle */}
        <Circle cx={20} cy={18} r={14} fill={color} />
      </Svg>
      {/* Category icon */}
      <View style={[styles.iconContainer, { width: size, height: size * 0.9 }]}>
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
