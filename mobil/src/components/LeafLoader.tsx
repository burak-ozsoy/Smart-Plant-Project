import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';

interface LeafLoaderProps {
  size?: number | 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export default function LeafLoader({ size = 'large', color, style }: LeafLoaderProps) {
  const { colors } = useThemeColors();

  // Map 'small' / 'large' to actual icon size values
  const numericSize = typeof size === 'number'
    ? size
    : size === 'small'
      ? 20
      : 50;

  const resolvedColor = color || colors.primary;

  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Looping float (up/down) animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    // Looping rotate (sway) animation
    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    rotateAnimation.start();

    return () => {
      floatAnimation.stop();
      rotateAnimation.stop();
    };
  }, [floatAnim, rotateAnim]);

  // Adjust translation range depending on size
  const floatRange = numericSize * 0.15; // 15% of size is floating offset
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-floatRange, floatRange],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-6deg', '6deg'],
  });

  return (
    <View style={[styles.container, { width: numericSize, height: numericSize }, style]}>
      <Animated.View
        style={[
          styles.animationContainer,
          {
            transform: [{ translateY }, { rotate }],
          }
        ]}
      >
        <MaterialCommunityIcons name="leaf" size={numericSize} color={resolvedColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible', // Keep it visible for float range
  },
  animationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
